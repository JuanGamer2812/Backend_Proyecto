// Query corregido - no usar columnas que no existen
const queryEventosUsuario = `
    SELECT DISTINCT e.id_evento, e.nombre_evento, e.fecha_evento, 
                 e.ubicacion, e.descripcion
    FROM evento e
    WHERE e.id_usuario = $1
    ORDER BY e.fecha_evento DESC
`;
const db = require('../config/db');

// Utilidades internas para descubrir el esquema real de la tabla evento
let cachedEventoColumns = null;
let lastEventoColumnsCheck = 0;
let cachedProveedorColumns = null;
let lastProveedorColumnsCheck = 0;

// Garantiza que las secuencias de IDs no se queden atrás tras restaurar backups
const syncSequence = async(client, tableName, idColumn) => {
    const seqResult = await client.query(
        'SELECT pg_get_serial_sequence($1, $2) AS seq_name', [tableName, idColumn]
    );

    const seqName = seqResult.rows[0] && seqResult.rows[0].seq_name;
    if (!seqName) return;

    const maxResult = await client.query(`SELECT COALESCE(MAX(${idColumn}), 0) AS max_id FROM ${tableName}`);
    const maxId = parseInt(maxResult.rows[0].max_id, 10) || 0;

    const seqValResult = await client.query(`SELECT last_value FROM ${seqName}`);
    const current = parseInt(seqValResult.rows[0].last_value, 10) || 0;

    const target = Math.max(maxId, current);
    await client.query('SELECT setval($1, $2, true)', [seqName, target]);
};

const tableExists = async(client, tableName) => {
    const result = await client.query('SELECT to_regclass($1) as reg', [`public.${tableName}`]);
    return Boolean(result.rows[0] && result.rows[0].reg);
};

const getProveedorColumns = async(client = db) => {
    const now = Date.now();
    if (cachedProveedorColumns && (now - lastProveedorColumnsCheck) < 5 * 60 * 1000) {
        return cachedProveedorColumns;
    }

    const { rows } = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'proveedor'
    `);

    cachedProveedorColumns = new Set(rows.map(r => r.column_name));
    lastProveedorColumnsCheck = now;
    return cachedProveedorColumns;
};

// Obtiene categoría real y precios del proveedor para validar contra el esquema y triggers
const fetchProveedorInfo = async(client, provId) => {
    const proveedorCols = await getProveedorColumns(client);

    const baseSelect = ['p.precio_base', 'p.id_tipo'];
    const hasPrecioPersona = proveedorCols.has('precio_persona');
    if (hasPrecioPersona) baseSelect.push('p.precio_persona');

    let joinTipo = '';
    const tipoExists = await tableExists(client, 'proveedor_tipo');
    if (tipoExists) {
        baseSelect.push('pt.nombre AS categoria_tipo');
        joinTipo = 'LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo';
    }

    const query = `SELECT ${baseSelect.join(', ')} FROM proveedor p ${joinTipo} WHERE p.id_proveedor = $1`;
    let row;

    try {
        const { rows } = await client.query(query, [provId]);
        row = rows[0] || {};
    } catch (err) {
        if (err.code === '42703') {
            // El esquema real no tiene alguna de las columnas asumidas; limpiar caché y reintentar solo con columnas seguras
            cachedProveedorColumns = null;
            lastProveedorColumnsCheck = 0;
            const safeSelect = ['p.precio_base', 'p.id_tipo'];
            if (hasPrecioPersona) safeSelect.push('p.precio_persona');
            if (tipoExists) safeSelect.push('pt.nombre AS categoria_tipo');

            const fallbackQuery = `SELECT ${safeSelect.join(', ')} FROM proveedor p ${joinTipo} WHERE p.id_proveedor = $1`;
            const { rows: safeRows } = await client.query(fallbackQuery, [provId]);
            row = safeRows[0] || {};
        } else {
            throw err;
        }
    }

    let categoria = row.categoria_tipo;
    if (!categoria && row.id_tipo && tipoExists) {
        const lookup = await client.query(
            'SELECT nombre FROM proveedor_tipo WHERE id_tipo = $1 LIMIT 1', [row.id_tipo]
        );
        categoria = (lookup.rows[0] && lookup.rows[0].nombre) || '';
    }

    const categoryValue = categoria ? categoria.toString().trim().toUpperCase() : '';

    return {
        precio_base: row.precio_base,
        precio_persona: row.precio_persona,
        categoria: categoryValue,
        id_tipo: row.id_tipo
    };
};

// Calcula el precio efectivo del proveedor según invitados y categoría
const calcularPrecioProveedor = async(client, prov, guestCount) => {
    const info = await fetchProveedorInfo(client, prov.id_proveedor);

    const base = parseFloat(info.precio_base) || 0;
    const perPerson = parseFloat(info.precio_persona);
    const hasPerPerson = !Number.isNaN(perPerson);

    const categoriaDb = (info.categoria || '').trim().toUpperCase();
    if (!categoriaDb) {
        throw new Error(`Proveedor ${prov.id_proveedor} no tiene categoría definida en BD`);
    }
    const isCatering = categoriaDb === 'CATERING';
    const multiplier = Math.max(guestCount, 0);

    const effectivePrice = hasPerPerson ?
        perPerson * multiplier :
        (isCatering && base ? base * multiplier : base);

    return { precioCalculado: effectivePrice, categoriaDb, idTipo: info.id_tipo };
};

const getEventoColumns = async(client = db) => {
    const now = Date.now();
    if (cachedEventoColumns && (now - lastEventoColumnsCheck) < 5 * 60 * 1000) {
        return cachedEventoColumns;
    }

    const { rows } = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'evento'
    `);

    cachedEventoColumns = new Set(rows.map(r => r.column_name));
    lastEventoColumnsCheck = now;
    return cachedEventoColumns;
};

// Cache columnas de reservacion
let cachedReservacionColumns = null;
let lastReservacionColumnsCheck = 0;

const getReservacionColumns = async(client = db) => {
    const now = Date.now();
    if (cachedReservacionColumns && (now - lastReservacionColumnsCheck) < 5 * 60 * 1000) {
        return cachedReservacionColumns;
    }
    const { rows } = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reservacion'
    `);
    cachedReservacionColumns = new Set(rows.map(r => r.column_name));
    lastReservacionColumnsCheck = now;
    return cachedReservacionColumns;
};

// Retorna el fragmento SELECT y JOIN necesarios para exponer tipo_evento sin depender del esquema exacto
const buildTipoEventoSelect = async(client = db) => {
    const eventoSchema = await getEventoColumns(client);
    const hasTipoEventoId = eventoSchema.has('tipo_evento_id');
    const hasTipoEventoText = eventoSchema.has('tipo_evento');
    const hasTipoEventoTable = hasTipoEventoId ? await tableExists(client, 'tipo_evento') : false;

    if (hasTipoEventoId && hasTipoEventoTable) {
        const colInfo = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'tipo_evento'
        `);
        const cols = colInfo.rows.map(r => r.column_name);
        const idCol = cols.find(c => c === 'id_tipo_evento') || cols.find(c => c === 'tipo_evento_id') || cols.find(c => c === 'id');
        const nameCol = cols.find(c => c === 'nombre') || cols.find(c => c === 'tipo_evento') || cols.find(c => c === 'tipo');

        if (idCol && nameCol) {
            return {
                select: `te.${nameCol} as tipo_evento`,
                joins: `LEFT JOIN tipo_evento te ON e.tipo_evento_id = te.${idCol}`
            };
        }
    }

    if (hasTipoEventoText) {
        return { select: 'e.tipo_evento', joins: '' };
    }

    return { select: 'NULL::text as tipo_evento', joins: '' };
};

// Busca el id de tipo de evento compatible con el esquema actual
const resolveTipoEventoId = async(client, tipoEventoInput) => {
    // Permitir que llegue como número directo
    const parsed = tipoEventoInput !== undefined && tipoEventoInput !== null ? parseInt(tipoEventoInput, 10) : NaN;
    if (!Number.isNaN(parsed)) {
        return parsed;
    }

    const nombreTipo = (tipoEventoInput || '').toString().trim();

    // Intentar tabla tipo_evento si existe y tiene columnas id/nombre reconocibles
    if (await tableExists(client, 'tipo_evento')) {
        const colInfo = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'tipo_evento'
        `);
        const cols = colInfo.rows.map(r => r.column_name);
        const idCol = cols.find(c => c === 'id_tipo_evento') || cols.find(c => c === 'tipo_evento_id') || cols.find(c => c === 'id');
        const nameCol = cols.find(c => c === 'nombre') || cols.find(c => c === 'tipo_evento') || cols.find(c => c === 'tipo');

        if (idCol && nameCol) {
            if (nombreTipo) {
                const match = await client.query(
                    `SELECT ${idCol} as id FROM tipo_evento WHERE UPPER(${nameCol}) = UPPER($1) LIMIT 1`, [nombreTipo]
                );
                if (match.rows[0]) {
                    return match.rows[0].id;
                }
            }

            const fallback = await client.query(
                `SELECT ${idCol} as id FROM tipo_evento ORDER BY ${idCol} ASC LIMIT 1`
            );
            if (fallback.rows[0]) {
                return fallback.rows[0].id;
            }

            throw new Error('Tabla tipo_evento existe pero está vacía; inserta al menos un registro o envía un tipoEvento válido ya existente');
        }

        throw new Error('Tabla tipo_evento encontrada pero sin columnas id/nombre reconocibles');
    }

    // Sin FK: intentar tratar tipoEvento como nombre libre o categoría
    if (await tableExists(client, 'categoria_evento')) {
        if (nombreTipo) {
            const match = await client.query(
                'SELECT id_categoria FROM categoria_evento WHERE UPPER(nombre) = UPPER($1) LIMIT 1', [nombreTipo]
            );
            if (match.rows[0]) {
                return match.rows[0].id_categoria;
            }
        }

        const fallback = await client.query(
            'SELECT id_categoria FROM categoria_evento ORDER BY id_categoria ASC LIMIT 1'
        );
        if (fallback.rows[0]) {
            return fallback.rows[0].id_categoria;
        }
    }

    throw new Error('Tipo de evento requerido y no se pudo resolver (tipoEvento)');
};

/**
 * Modelo para Reservas - Maneja evento, reservacion y evento_proveedor
 */

const Reserva = {
    /**
     * Crear una nueva reserva con evento y proveedores asignados
     * Usa transacciones para garantizar consistencia
     */
    create: async(datos) => {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            await syncSequence(client, 'evento', 'id_evento');
            await syncSequence(client, 'reservacion', 'id_reservacion');

            const {
                nombreEvento,
                tipoEvento,
                descripcion,
                fechaInicio,
                fechaFin,
                precioBase,
                hayPlaylist,
                playlist,
                idUsuario,
                idPlan = 1,
                proveedores = [],
                numeroInvitados,
                numero_invitados,
                cedulaReservacion,
                cedula_reservacion,
                creadoPor,
                idCategoria,
                id_categoria
            } = datos;

            const invitados = parseInt(numeroInvitados ?? numero_invitados ?? '', 10);
            const guestCount = Number.isNaN(invitados) ? 0 : Math.max(invitados, 0);
            const cedula = (cedulaReservacion ?? cedula_reservacion ?? '').toString() || '0000000000';

            const frontendSentSubtotal = (typeof datos.subtotal === 'number' && !isNaN(datos.subtotal)) || (typeof datos.subtotal === 'string' && !isNaN(Number(datos.subtotal)));

            let subtotal = 0;
            let iva;
            let total;

            if (frontendSentSubtotal) {
                subtotal = Number(datos.subtotal);
                iva = (typeof datos.iva === 'number' && !isNaN(datos.iva)) ? Number(datos.iva) : Number((subtotal * 0.15).toFixed(2));
                total = (typeof datos.total === 'number' && !isNaN(datos.total)) ? Number(datos.total) : Number((subtotal + iva).toFixed(2));
            } else {
                subtotal = parseFloat(precioBase) || 0;
            }

            const proveedoresCalculados = [];
            if (frontendSentSubtotal) {
                // Build proveedoresCalculados but do not accumulate into subtotal (frontend provided totals)
                for (const prov of proveedores) {
                    let precioCalculado = null;
                    let categoriaDb = prov.categoriaDb || prov.categoria || null;
                    let idTipo = prov.idTipo || prov.id_tipo || null;

                    if (prov._precio_calculado != null) {
                        precioCalculado = Number(prov._precio_calculado);
                    } else if (typeof prov.precio_calculado === 'number' && !isNaN(prov.precio_calculado)) {
                        precioCalculado = Number(prov.precio_calculado);
                    } else if (typeof prov.precioCalculado === 'number' && !isNaN(prov.precioCalculado)) {
                        precioCalculado = Number(prov.precioCalculado);
                    } else {
                        const calc = await calcularPrecioProveedor(client, prov, guestCount);
                        precioCalculado = Number(calc.precioCalculado || 0);
                        categoriaDb = (categoriaDb || calc.categoriaDb || '').toUpperCase();
                        idTipo = idTipo || calc.idTipo || null;
                    }

                    proveedoresCalculados.push(Object.assign({}, prov, { precioCalculado, categoriaDb, idTipo }));
                }
            } else {
                for (const prov of proveedores) {
                    let precioCalculado = 0;
                    let categoriaDb = prov.categoriaDb || prov.categoria || null;
                    let idTipo = prov.idTipo || prov.id_tipo || null;

                    if (typeof prov.precio_calculado === 'number' && !isNaN(prov.precio_calculado)) {
                        precioCalculado = Number(prov.precio_calculado);
                        if (!categoriaDb || !idTipo) {
                            const info = await fetchProveedorInfo(client, prov.id_proveedor);
                            categoriaDb = (categoriaDb || info.categoria || '').toUpperCase();
                            idTipo = idTipo || info.id_tipo || null;
                        }
                    } else if (typeof prov.precioCalculado === 'number' && !isNaN(prov.precioCalculado)) {
                        precioCalculado = Number(prov.precioCalculado);
                        if (!categoriaDb || !idTipo) {
                            const info = await fetchProveedorInfo(client, prov.id_proveedor);
                            categoriaDb = (categoriaDb || info.categoria || '').toUpperCase();
                            idTipo = idTipo || info.id_tipo || null;
                        }
                    } else {
                        const calc = await calcularPrecioProveedor(client, prov, guestCount);
                        precioCalculado = Number(calc.precioCalculado || 0);
                        categoriaDb = (categoriaDb || calc.categoriaDb || '').toUpperCase();
                        idTipo = idTipo || calc.idTipo || null;
                    }

                    subtotal += precioCalculado;
                    proveedoresCalculados.push(Object.assign({}, prov, { precioCalculado, categoriaDb, idTipo }));
                }
            }

            // Calcular impuestos (si no fueron provistos por frontend)
            if (iva === undefined || iva === null) iva = subtotal * 0.15;
            if (total === undefined || total === null) total = subtotal + iva;

            // Mapear proveedores por categoría para columnas del evento
            const provByCategory = {};
            for (const prov of proveedoresCalculados) {
                const cat = (prov.categoriaDb || '').toUpperCase();
                if (cat === 'MUSICA' && !provByCategory.id_proveedor_musica) provByCategory.id_proveedor_musica = prov.id_proveedor;
                if (cat === 'CATERING' && !provByCategory.id_proveedor_catering) provByCategory.id_proveedor_catering = prov.id_proveedor;
                if (cat === 'DECORACION' && !provByCategory.id_proveedor_decoracion) provByCategory.id_proveedor_decoracion = prov.id_proveedor;
                if (cat === 'LUGAR' && !provByCategory.id_proveedor_lugar) provByCategory.id_proveedor_lugar = prov.id_proveedor;
            }

            const idCategoriaValue = idCategoria ?? id_categoria ?? null;
            const creadoPorValue = creadoPor || 'Usuario';

            // Determinar plan del evento a partir de los proveedores (mezcla => plan 4 personalizado)
            const planesSet = new Set(
                (proveedores || [])
                .map(p => Number(p.id_plan ?? p.plan ?? p.idPlan ?? p.id_plan_reserva ?? p.idPlanSeleccionado ?? idPlan ?? 1))
                .filter(n => Number.isFinite(n))
            );
            const planEvento = planesSet.size === 0 ?
                (Number.isFinite(Number(datos.id_plan)) ? Number(datos.id_plan) : (idPlan ?? 1)) :
                (planesSet.size === 1 ? [...planesSet][0] : 4);
            console.log('🎛️ planEvento detectado (create):', { planesProveedores: Array.from(planesSet), planEvento });

            // 1. Insertar evento
            const eventoColumns = [
                'nombre_evento',
                'descripcion_evento',
                'fecha_inicio_evento',
                'fecha_fin_evento',
                'precio_evento',
                'hay_playlist_evento',
                'playlist_evento',
                'creado_por',
                'id_usuario_creador',
                'id_plan'
            ];
            const eventoValues = [
                nombreEvento,
                descripcion,
                fechaInicio,
                fechaFin,
                total,
                hayPlaylist || false,
                playlist || null,
                creadoPorValue,
                idUsuario,
                planEvento
            ];

            const eventoSchema = await getEventoColumns(client);
            if (eventoSchema.has('tipo_evento_id')) {
                // En este flujo ignoramos tipo_evento y enviamos NULL si la columna existe.
                eventoColumns.push('tipo_evento_id');
                eventoValues.push(null);
            }

            if (eventoSchema.has('id_categoria')) {
                eventoColumns.push('id_categoria');
                eventoValues.push(idCategoriaValue);
            }

            if (eventoSchema.has('id_proveedor_musica') && provByCategory.id_proveedor_musica) {
                eventoColumns.push('id_proveedor_musica');
                eventoValues.push(provByCategory.id_proveedor_musica);
            }
            if (eventoSchema.has('id_proveedor_catering') && provByCategory.id_proveedor_catering) {
                eventoColumns.push('id_proveedor_catering');
                eventoValues.push(provByCategory.id_proveedor_catering);
            }
            if (eventoSchema.has('id_proveedor_decoracion') && provByCategory.id_proveedor_decoracion) {
                eventoColumns.push('id_proveedor_decoracion');
                eventoValues.push(provByCategory.id_proveedor_decoracion);
            }
            if (eventoSchema.has('id_proveedor_lugar') && provByCategory.id_proveedor_lugar) {
                eventoColumns.push('id_proveedor_lugar');
                eventoValues.push(provByCategory.id_proveedor_lugar);
            }

            const placeholders = eventoColumns.map((_, idx) => `$${idx + 1}`);
            const eventoResult = await client.query(
                `INSERT INTO evento (${eventoColumns.join(', ')})
                 VALUES (${placeholders.join(', ')})
                 RETURNING id_evento`,
                eventoValues
            );

            const idEvento = eventoResult.rows[0].id_evento;

            // 2. Insertar reservacion con montos e invitados (asumimos esquema estándar)
            console.log('About to INSERT reservacion/evento -> subtotal:', subtotal, 'iva:', iva, 'total:', total, 'providers to insert:', proveedoresCalculados.map(p => ({ id: p.id_proveedor, precio: (p._precio_calculado != null ? p._precio_calculado : (p.precioCalculado != null ? p.precioCalculado : 'compute')) })));

            const reservaResult = await client.query(`
                INSERT INTO reservacion (
                    fecha_reservacion,
                    cedula_reservacion,
                    numero_invitados,
                    subtotal,
                    iva,
                    total,
                    id_usuario,
                    id_evento
                ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7) RETURNING id_reservacion
            `, [cedula, guestCount, subtotal, iva, total, idUsuario, idEvento]);
            const idReservacion = reservaResult.rows[0].id_reservacion;

            // Normalizar y upsert de factura según payload (método, comprobante, transactionId)
            // Normalizar método y decidir si el pago está confirmado/cancelado
            const pagoObj = datos?.pago || {};
            const metodoFromBody = datos?.metodo_pago_factura || pagoObj.metodo || pagoObj.metodoPago || pagoObj?.datos?.metodo || null;
            const metodoNorm = String(metodoFromBody || '').toLowerCase();

            const numeroComprobante = datos?.numero_comprobante ||
                pagoObj?.numero_comprobante ||
                pagoObj?.numeroComprobante ||
                pagoObj?.datos?.numeroComprobante ||
                pagoObj?.datos?.numero_comprobante ||
                pagoObj?.comprobante ||
                datos?.comprobante ||
                null;

            const transactionId = pagoObj?.transactionId || pagoObj?.transaction_id ||
                pagoObj?.datos?.transactionId || pagoObj?.datos?.transaction_id ||
                pagoObj?.idTransaccion || datos?.transactionId || datos?.transaction_id || null;

            let numeroAutorizacion = pagoObj?.numero_autorizacion || pagoObj?.numeroAutorizacion || pagoObj?.datos?.numeroAutorizacion || pagoObj?.datos?.numero_autorizacion || datos?.numero_autorizacion || datos?.numeroAutorizacion || null;

            const estadoRaw = String(pagoObj?.estado || pagoObj?.status || '').toLowerCase();
            const successRaw = pagoObj?.success;
            const pagoSuccess = (successRaw === true) || (typeof successRaw === 'string' && ['true', '1', 'ok', 'success', 'sí', 'si'].includes(String(successRaw).toLowerCase())) || ['pagada', 'pagado', 'completado', 'success', 'ok'].includes(estadoRaw);

            const hasNumeroComprobante = numeroComprobante && String(numeroComprobante).trim() !== '';
            const hasTransactionId = transactionId && String(transactionId).trim() !== '';

            const pagoConfirmado = pagoSuccess || hasNumeroComprobante || hasTransactionId;

            // Timestamp emisión y helper UTC-5
            function toOffsetISOString(offsetHours) {
                const now = new Date();
                const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
                const target = new Date(utcMs + offsetHours * 3600000);
                const pad = n => String(n).padStart(2, '0');
                const yyyy = target.getFullYear();
                const MM = pad(target.getMonth() + 1);
                const dd = pad(target.getDate());
                const hh = pad(target.getHours());
                const mm = pad(target.getMinutes());
                const ss = pad(target.getSeconds());
                const sign = offsetHours >= 0 ? '+' : '-';
                const off = Math.abs(offsetHours);
                const offHH = pad(Math.floor(off));
                const offMM = pad(Math.floor((off - Math.floor(off)) * 60));
                return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${sign}${offHH}:${offMM}`;
            }

            // si no viene numeroAutorizacion, generarlo a partir de idReservacion + timestamp
            if (!numeroAutorizacion) numeroAutorizacion = `AUTO-${idReservacion}-${Date.now()}`;

            // estado y fecha de pago (respeta estados de cancelación explícitos)
            const estadoLower = estadoRaw;
            let estadoPago = 'pendiente';
            if (['cancelado', 'cancelada', 'rechazado', 'rejected', 'failed', 'fail', 'error'].includes(estadoLower)) {
                estadoPago = 'cancelado';
            } else if (pagoConfirmado) {
                estadoPago = 'pagada';
            }

            const fechaEmisionStr = toOffsetISOString(-5);
            const fechaPagoStr = (estadoPago === 'pagada') ? fechaEmisionStr : null;

            // Método: preferir exactamente lo que envía el front si existe
            let metodoPagoFactura = metodoFromBody || null;
            if (!metodoPagoFactura) {
                const m = metodoNorm;
                if (m.includes('deposit') || m.includes('efect')) metodoPagoFactura = 'Efectivo';
                else if (m.includes('transfer')) metodoPagoFactura = 'Transferencia';
                else if (m.includes('tarjeta') || m.includes('credito') || m.includes('crédito') || m.includes('visa')) metodoPagoFactura = 'Tarjeta';
                else if (m.includes('paypal')) metodoPagoFactura = 'PayPal';
                else metodoPagoFactura = 'pendiente';
            }

            const params = estadoPago === 'pagada' ? [numeroAutorizacion, metodoPagoFactura, subtotal, iva, total, idReservacion, estadoPago, fechaEmisionStr, fechaPagoStr] : [numeroAutorizacion, metodoPagoFactura, subtotal, iva, total, idReservacion, estadoPago, fechaEmisionStr];

            console.log('Factura upsert (create) ->', { pagoObj, pagoConfirmado, estadoPago, numeroAutorizacion, metodoPagoFactura, params });

            await client.query(`
                            INSERT INTO factura (
                                numero_autorizacion_factura, metodo_pago_factura, subtotal_factura, impuestos_factura, total_factura,
                                id_reservacion, estado_pago, fecha_emision_factura${pagoConfirmado ? ', fecha_pago' : ''}
                            ) VALUES (${pagoConfirmado ? '$1,$2,$3,$4,$5,$6,$7,$8,$9' : '$1,$2,$3,$4,$5,$6,$7,$8'})
                            ON CONFLICT (id_reservacion) DO UPDATE SET
                                numero_autorizacion_factura = EXCLUDED.numero_autorizacion_factura,
                                metodo_pago_factura       = EXCLUDED.metodo_pago_factura,
                                subtotal_factura          = EXCLUDED.subtotal_factura,
                                impuestos_factura         = EXCLUDED.impuestos_factura,
                                total_factura             = EXCLUDED.total_factura,
                                estado_pago               = EXCLUDED.estado_pago,
                                fecha_emision_factura     = EXCLUDED.fecha_emision_factura
                                ${pagoConfirmado ? ', fecha_pago = EXCLUDED.fecha_pago' : ''}
                        `, params);

            // 3. Insertar proveedores del evento en evento_proveedor usando columnas reales del esquema
            for (const prov of proveedoresCalculados) {
                const start = prov.horaInicio || fechaInicio;
                const end = prov.horaFin || fechaFin;

                // Verificar solapamiento con otros evento_proveedor para el mismo proveedor
                const overlapQuery = `
                                        SELECT 1 FROM evento_proveedor ep
                                        WHERE ep.id_proveedor = $1
                                            AND ep.fecha_inicio_evento IS NOT NULL
                                            AND ep.fecha_fin_evento IS NOT NULL
                                            AND ep.fecha_inicio_evento < $3
                                            AND ep.fecha_fin_evento > $2
                                        LIMIT 1
                                `;
                console.log(`Checking provider overlap`, { providerId: prov.id_proveedor, start, end });
                const overlapRes = await client.query(overlapQuery, [prov.id_proveedor, start, end]);
                if (overlapRes.rows && overlapRes.rows.length > 0) {
                    const err = new Error(`Proveedor ${prov.id_proveedor} solapa con otro evento en ese periodo`);
                    err.status = 409;
                    err.code = 'PROVIDER_OVERLAP';
                    err.providerId = prov.id_proveedor;
                    throw err;
                }

                // Preferir precio enviado por frontend (_precio_calculado) o precioCalculado ya calculado; si no, calcular ahora
                let precioAplicado;
                if (prov._precio_calculado != null) {
                    precioAplicado = Number(prov._precio_calculado);
                    if ((!prov.categoriaDb || !prov.idTipo) && prov.id_proveedor) {
                        const info = await fetchProveedorInfo(client, prov.id_proveedor);
                        prov.categoriaDb = prov.categoriaDb || (info.categoria || '').toUpperCase();
                        prov.idTipo = prov.idTipo || info.id_tipo || null;
                    }
                } else if (prov.precioCalculado != null) {
                    precioAplicado = Number(prov.precioCalculado);
                    if ((!prov.categoriaDb || !prov.idTipo) && prov.id_proveedor) {
                        const info = await fetchProveedorInfo(client, prov.id_proveedor);
                        prov.categoriaDb = prov.categoriaDb || (info.categoria || '').toUpperCase();
                        prov.idTipo = prov.idTipo || info.id_tipo || null;
                    }
                } else {
                    const calcNow = await calcularPrecioProveedor(client, prov, guestCount);
                    precioAplicado = Number(calcNow.precioCalculado || 0);
                    prov.categoriaDb = prov.categoriaDb || (calcNow.categoriaDb || '').toUpperCase();
                    prov.idTipo = prov.idTipo || calcNow.idTipo || null;
                }

                await client.query(`
                    INSERT INTO evento_proveedor (
                        id_evento,
                        id_proveedor,
                        id_tipo,
                        precio_acordado,
                        fecha_inicio_evento,
                        fecha_fin_evento
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    idEvento,
                    prov.id_proveedor,
                    prov.idTipo || prov.id_tipo || null,
                    precioAplicado,
                    start,
                    end
                ]);
            }

            // 4. Insertar invitados en la tabla invitado
            const invitadosArray = datos.invitados || [];
            console.log(`📋 Verificando invitados recibidos en create():`, {
                esArray: Array.isArray(invitadosArray),
                cantidad: invitadosArray.length,
                primerInvitado: invitadosArray[0] || null
            });

            if (Array.isArray(invitadosArray) && invitadosArray.length > 0) {
                let insertadosCount = 0;
                for (const inv of invitadosArray) {
                    try {
                        // Mapear campos (frontend puede enviar nombres alternos)
                        const nombre = String(inv.nombre || inv.nombre_invitado || '').trim();
                        const email = String(inv.email || inv.email_invitado || '').trim() || null;
                        const telefono = String(inv.telefono || inv.telefono_invitado || '').trim() || null;
                        const acompanantes = Number(inv.acompanantes ?? inv.numero_acompanantes ?? 0) || 0;
                        const notasInv = String(inv.notas || '').trim() || null;

                        if (!nombre) {
                            console.warn(`⚠️ Invitado sin nombre válido, saltando:`, inv);
                            continue;
                        }

                        console.log(`  💾 Insertando invitado:`, { nombre, email, telefono, acompanantes, notas: notasInv });

                        await client.query(`
                            INSERT INTO invitado (id_evento, nombre, email, telefono, acompanantes, notas)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [idEvento, nombre, email, telefono, acompanantes, notasInv]);

                        insertadosCount++;
                        console.log(`  ✅ Invitado "${nombre}" insertado (${acompanantes} acompañantes)`);
                    } catch (invError) {
                        console.error(`❌ ERROR insertando invitado:`, {
                            invitado: inv,
                            error: invError.message
                        });
                        throw invError; // Re-lanzar para hacer rollback
                    }
                }
                console.log(`👥 Total: ${insertadosCount}/${invitadosArray.length} invitados insertados para evento ${idEvento}`);
            } else {
                console.log(`ℹ️ No hay invitados para insertar en create()`);
            }

            await client.query('COMMIT');

            return {
                id_reservacion: idReservacion,
                id_evento: idEvento,
                total: total,
                evento: {
                    id_evento: idEvento,
                    nombre_evento: nombreEvento,
                    fecha_inicio_evento: fechaInicio,
                    fecha_fin_evento: fechaFin
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error en Reserva.create:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Obtener reserva por ID con detalles de evento y proveedores
     */
    findById: async(id) => {
        try {
            const { select: tipoEventoSelect, joins: tipoEventoJoins } = await buildTipoEventoSelect();
            // Usar la columna `total` según el esquema oficial del dump
            const totalSelect = 'r.total as total';

            const query = `
                SELECT 
                    r.id_reservacion,
                    r.fecha_reservacion,
                    ${totalSelect},
                    r.cedula_reservacion,
                    r.id_usuario,
                    e.id_evento,
                    e.nombre_evento,
                    e.descripcion_evento,
                    e.fecha_inicio_evento,
                    e.fecha_fin_evento,
                    e.precio_evento,
                    ${tipoEventoSelect},
                    e.hay_playlist_evento,
                    e.playlist_evento,
                    json_agg(
                        json_build_object(
                            'id_evento_proveedor', ep.id_evento_proveedor,
                            'id_proveedor', ep.id_proveedor,
                            'nombre', p.nombre,
                            'categoria', ep.categoria,
                            'plan', ep.plan,
                            'hora_inicio', ep.hora_inicio,
                            'hora_fin', ep.hora_fin,
                            'notas_adicionales', ep.notas_adicionales,
                            'precio', ep.precio
                        )
                    ) FILTER (WHERE ep.id_evento_proveedor IS NOT NULL) as proveedores
                FROM reservacion r
                JOIN evento e ON r.id_evento = e.id_evento
                ${tipoEventoJoins}
                LEFT JOIN evento_proveedor ep ON e.id_evento = ep.id_evento
                LEFT JOIN proveedor p ON ep.id_proveedor = p.id_proveedor
                WHERE r.id_reservacion = $1
                GROUP BY r.id_reservacion, e.id_evento
            `;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error en Reserva.findById:', error);
            throw error;
        }
    },

    /**
     * Obtener reservas por usuario
     */
    findByUsuario: async(idUsuario) => {
        try {
            const { select: tipoEventoSelect, joins: tipoEventoJoins } = await buildTipoEventoSelect();
            const query = `
                SELECT 
                    r.id_reservacion,
                    r.fecha_reservacion,
                    r.total as total,
                    r.cedula_reservacion,
                    r.id_usuario,
                    e.id_evento,
                    e.nombre_evento,
                    e.descripcion_evento,
                    e.fecha_inicio_evento,
                    e.fecha_fin_evento,
                    e.precio_evento,
                    ${tipoEventoSelect},
                    COUNT(ep.id_evento_proveedor) as cantidad_proveedores
                FROM reservacion r
                JOIN evento e ON r.id_evento = e.id_evento
                ${tipoEventoJoins}
                LEFT JOIN evento_proveedor ep ON e.id_evento = ep.id_evento
                WHERE r.id_usuario = $1
                GROUP BY r.id_reservacion, e.id_evento
                ORDER BY r.fecha_reservacion DESC
            `;
            const result = await db.query(query, [idUsuario]);
            return result.rows;
        } catch (error) {
            console.error('Error en Reserva.findByUsuario:', error);
            throw error;
        }
    },

    /**
     * Obtener todas las reservas (admin)
     */
    findAll: async() => {
        try {
            const { select: tipoEventoSelect, joins: tipoEventoJoins } = await buildTipoEventoSelect();
            const query = `
                SELECT 
                    r.id_reservacion,
                    r.fecha_reservacion,
                    r.total as total,
                    r.cedula_reservacion,
                    r.id_usuario,
                    e.id_evento,
                    e.nombre_evento,
                    e.descripcion_evento,
                    e.fecha_inicio_evento,
                    e.fecha_fin_evento,
                    e.precio_evento,
                    ${tipoEventoSelect},
                    COUNT(ep.id_evento_proveedor) as cantidad_proveedores
                FROM reservacion r
                JOIN evento e ON r.id_evento = e.id_evento
                ${tipoEventoJoins}
                LEFT JOIN evento_proveedor ep ON e.id_evento = ep.id_evento
                GROUP BY r.id_reservacion, e.id_evento
                ORDER BY r.fecha_reservacion DESC
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error en Reserva.findAll:', error);
            throw error;
        }
    },

    /**
     * Actualizar estado de una reserva (a través del evento)
     */
    updateEstado: async(idReservacion, nuevoEstado) => {
        // La tabla evento no expone columnas estado_evento/fecha_modificacion en el esquema actual.
        // Para evitar errores de SQL, reportamos el impedimento explícitamente.
        throw new Error('No se puede actualizar estado: la tabla evento no tiene columnas de estado en el esquema actual');
    },

    /**
     * Eliminar una reserva (elimina evento y evento_proveedor en cascada)
     */
    delete: async(idReservacion) => {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Obtener id_evento
            const reservaResult = await client.query(
                'SELECT id_evento FROM reservacion WHERE id_reservacion = $1', [idReservacion]
            );

            if (!reservaResult.rows[0]) {
                throw new Error('Reservacion no encontrada');
            }

            const idEvento = reservaResult.rows[0].id_evento;

            // Eliminar evento (esto eliminará evento_proveedor en cascada)
            await client.query(
                'DELETE FROM evento WHERE id_evento = $1', [idEvento]
            );

            // Eliminar reservacion
            const result = await client.query(
                'DELETE FROM reservacion WHERE id_reservacion = $1 RETURNING *', [idReservacion]
            );

            await client.query('COMMIT');
            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error en Reserva.delete:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Crear nueva reservación con evento, invitados y proveedores
     * Para sistema de reservas completo con cédula e IVA
     */
    createReserva: async(data) => {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            await syncSequence(client, 'evento', 'id_evento');
            await syncSequence(client, 'reservacion', 'id_reservacion');

            const {
                id_usuario,
                evento,
                proveedores,
                cedulaReservacion,
                numeroInvitados,
                numero_invitados,
                invitados
            } = data;

            const invitadosInput = numeroInvitados ?? numero_invitados ?? (invitados ? invitados.length : undefined);
            const guestCount = Number.isNaN(parseInt(invitadosInput, 10)) ? 0 : Math.max(parseInt(invitadosInput, 10), 0);
            const cedula = (cedulaReservacion || '').toString();

            const frontendSentSubtotal = (typeof data.subtotal === 'number' && !isNaN(data.subtotal)) || (typeof data.subtotal === 'string' && !isNaN(Number(data.subtotal)));

            let subtotalCalc = 0;
            let ivaCalc;
            let totalCalc;
            const proveedoresCalculados = [];

            if (frontendSentSubtotal) {
                subtotalCalc = Number(data.subtotal);
                ivaCalc = (typeof data.iva === 'number' && !isNaN(data.iva)) ? Number(data.iva) : Number((subtotalCalc * 0.15).toFixed(2));
                totalCalc = (typeof data.total === 'number' && !isNaN(data.total)) ? Number(data.total) : Number((subtotalCalc + ivaCalc).toFixed(2));

                for (const prov of proveedores) {
                    let precioCalculado = null;
                    let categoriaDb = prov.categoriaDb || prov.categoria || null;
                    let idTipo = prov.idTipo || prov.id_tipo || null;

                    if (prov._precio_calculado != null) {
                        precioCalculado = Number(prov._precio_calculado);
                    } else if (typeof prov.precio_calculado === 'number' && !isNaN(prov.precio_calculado)) {
                        precioCalculado = Number(prov.precio_calculado);
                    } else if (typeof prov.precioCalculado === 'number' && !isNaN(prov.precioCalculado)) {
                        precioCalculado = Number(prov.precioCalculado);
                    } else {
                        const calc = await calcularPrecioProveedor(client, prov, guestCount);
                        precioCalculado = Number(calc.precioCalculado || 0);
                        categoriaDb = (categoriaDb || calc.categoriaDb || '').toUpperCase();
                        idTipo = idTipo || calc.idTipo || null;
                    }

                    proveedoresCalculados.push(Object.assign({}, prov, { precioCalculado, categoriaDb, idTipo }));
                }
            } else {
                subtotalCalc = parseFloat(evento.precioBase) || 0;
                if (proveedores && proveedores.length > 0) {
                    for (const prov of proveedores) {
                        let precioCalculado = 0;
                        let categoriaDb = prov.categoriaDb || prov.categoria || null;
                        let idTipo = prov.idTipo || prov.id_tipo || null;

                        if (typeof prov.precio_calculado === 'number' && !isNaN(prov.precio_calculado)) {
                            precioCalculado = Number(prov.precio_calculado);
                            if (!categoriaDb || !idTipo) {
                                const info = await fetchProveedorInfo(client, prov.id_proveedor);
                                categoriaDb = (categoriaDb || info.categoria || '').toUpperCase();
                                idTipo = idTipo || info.id_tipo || null;
                            }
                        } else if (typeof prov.precioCalculado === 'number' && !isNaN(prov.precioCalculado)) {
                            precioCalculado = Number(prov.precioCalculado);
                            if (!categoriaDb || !idTipo) {
                                const info = await fetchProveedorInfo(client, prov.id_proveedor);
                                categoriaDb = (categoriaDb || info.categoria || '').toUpperCase();
                                idTipo = idTipo || info.id_tipo || null;
                            }
                        } else {
                            const calc = await calcularPrecioProveedor(client, prov, guestCount);
                            precioCalculado = Number(calc.precioCalculado || 0);
                            categoriaDb = (categoriaDb || calc.categoriaDb || '').toUpperCase();
                            idTipo = idTipo || calc.idTipo || null;
                        }

                        subtotalCalc += precioCalculado;
                        proveedoresCalculados.push(Object.assign({}, prov, { precioCalculado, categoriaDb, idTipo }));
                    }
                }
            }

            if (!frontendSentSubtotal) {
                ivaCalc = subtotalCalc * 0.15;
                totalCalc = subtotalCalc + ivaCalc;
            }

            // Determinar plan del evento a partir de los proveedores (mezcla => plan 4 personalizado)
            const planesSet = new Set(
                (proveedores || [])
                .map(p => Number(p.id_plan ?? p.plan ?? p.idPlan ?? p.id_plan_reserva ?? p.idPlanSeleccionado ?? evento?.id_plan ?? evento?.idPlan ?? 1))
                .filter(n => Number.isFinite(n))
            );
            const planEvento = planesSet.size === 0 ?
                (Number.isFinite(Number(evento?.id_plan)) ? Number(evento.id_plan) : (evento?.idPlan ?? evento?.id_plan_reserva ?? evento?.idPlanSeleccionado ?? 1)) :
                (planesSet.size === 1 ? [...planesSet][0] : 4);
            console.log('🎛️ planEvento detectado (createReserva):', { planesProveedores: Array.from(planesSet), planEvento });

            // 1. Crear evento
            const eventoColumns = [
                'nombre_evento', 'descripcion',
                'fecha_inicio', 'fecha_fin', 'precio_base',
                'playlist', 'id_usuario'
            ];
            const eventoValues = [
                evento.nombreEvento,
                evento.descripcion,
                evento.fechaInicio,
                evento.fechaFin,
                totalCalc,
                evento.playlist || null,
                id_usuario
            ];

            const eventoSchema = await getEventoColumns(client);
            if (eventoSchema.has('tipo_evento_id')) {
                // Para este flujo no se usa tipo_evento; se envía NULL si la columna existe.
                eventoColumns.push('tipo_evento_id');
                eventoValues.push(null);
            }

            if (eventoSchema.has('id_plan')) {
                eventoColumns.push('id_plan');
                eventoValues.push(planEvento);
            }

            if (eventoSchema.has('id_categoria')) {
                const catValor = evento.idCategoria ?? evento.id_categoria ?? null;
                eventoColumns.push('id_categoria');
                eventoValues.push(catValor);
            }

            const placeholders = eventoColumns.map((_, idx) => `$${idx + 1}`);
            const eventoResult = await client.query(
                `INSERT INTO evento (${eventoColumns.join(', ')})
                 VALUES (${placeholders.join(', ')})
                 RETURNING id_evento`,
                eventoValues
            );

            const id_evento = eventoResult.rows[0].id_evento;

            // 2. Crear reservación con cédula y totales calculados
            console.log('About to INSERT reservacion/evento -> subtotal:', subtotalCalc, 'iva:', ivaCalc, 'total:', totalCalc, 'providers to insert:', proveedoresCalculados.map(p => ({ id: p.id_proveedor, precio: (p._precio_calculado != null ? p._precio_calculado : (p.precioCalculado != null ? p.precioCalculado : 'compute')) })));

            const reservaResult = await client.query(`
                INSERT INTO reservacion (
                    id_evento, id_usuario, fecha_reservacion, 
                    estado, cedula_reservacion, numero_invitados,
                    subtotal, iva, total
                ) VALUES ($1, $2, CURRENT_TIMESTAMP, 'pendiente', $3, $4, $5, $6, $7)
                RETURNING id_reservacion
            `, [
                id_evento,
                id_usuario,
                cedula,
                guestCount,
                subtotalCalc,
                ivaCalc,
                totalCalc
            ]);

            const id_reservacion = reservaResult.rows[0].id_reservacion;

            // Upsert factura normalizada (sobrescribe fila creada por triggers si existe)
            // Normalizar y upsert de factura según payload (método, comprobante, transactionId)
            const pagoObj = data?.pago || {};
            const metodoFromBody = data?.metodo_pago_factura || pagoObj.metodo || pagoObj.metodoPago || pagoObj?.datos?.metodo || null;
            const metodoNorm = String(metodoFromBody || '').toLowerCase();

            const numeroComprobante = data?.numero_comprobante ||
                pagoObj?.numero_comprobante ||
                pagoObj?.numeroComprobante ||
                pagoObj?.datos?.numeroComprobante ||
                pagoObj?.datos?.numero_comprobante ||
                pagoObj?.comprobante ||
                data?.comprobante ||
                null;

            const transactionId = pagoObj?.transactionId || pagoObj?.transaction_id ||
                pagoObj?.datos?.transactionId || pagoObj?.datos?.transaction_id ||
                pagoObj?.idTransaccion || data?.transactionId || data?.transaction_id || null;

            let numeroAutorizacion = pagoObj?.numero_autorizacion || pagoObj?.numeroAutorizacion || pagoObj?.datos?.numeroAutorizacion || pagoObj?.datos?.numero_autorizacion || data?.numero_autorizacion || data?.numeroAutorizacion || null;

            const estadoRaw = String(pagoObj?.estado || pagoObj?.status || '').toLowerCase();
            const successRaw = pagoObj?.success;
            const pagoSuccess = (successRaw === true) || (typeof successRaw === 'string' && ['true', '1', 'ok', 'success', 'sí', 'si'].includes(String(successRaw).toLowerCase())) || ['pagada', 'pagado', 'completado', 'success', 'ok'].includes(estadoRaw);

            const hasNumeroComprobante = numeroComprobante && String(numeroComprobante).trim() !== '';
            const hasTransactionId = transactionId && String(transactionId).trim() !== '';

            const pagoConfirmado = pagoSuccess || hasNumeroComprobante || hasTransactionId;

            // Timestamp emisión y helper UTC-5
            function toOffsetISOString(offsetHours) {
                const now = new Date();
                const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
                const target = new Date(utcMs + offsetHours * 3600000);
                const pad = n => String(n).padStart(2, '0');
                const yyyy = target.getFullYear();
                const MM = pad(target.getMonth() + 1);
                const dd = pad(target.getDate());
                const hh = pad(target.getHours());
                const mm = pad(target.getMinutes());
                const ss = pad(target.getSeconds());
                const sign = offsetHours >= 0 ? '+' : '-';
                const off = Math.abs(offsetHours);
                const offHH = pad(Math.floor(off));
                const offMM = pad(Math.floor((off - Math.floor(off)) * 60));
                return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${sign}${offHH}:${offMM}`;
            }

            // si no viene numeroAutorizacion, generarlo a partir de id_reservacion + timestamp
            if (!numeroAutorizacion) numeroAutorizacion = `AUTO-${id_reservacion}-${Date.now()}`;

            // estado y fecha de pago (respeta estados de cancelación explícitos)
            const estadoLower = estadoRaw;
            let estadoPago = 'pendiente';
            if (['cancelado', 'cancelada', 'rechazado', 'rejected', 'failed', 'fail', 'error'].includes(estadoLower)) {
                estadoPago = 'cancelado';
            } else if (pagoConfirmado) {
                estadoPago = 'pagada';
            }

            const fechaEmisionStr = toOffsetISOString(-5);
            const fechaPagoStr = (estadoPago === 'pagada') ? fechaEmisionStr : null;

            // Método: preferir exactamente lo que envía el front si existe
            let metodoPagoFactura = metodoFromBody || null;
            if (!metodoPagoFactura) {
                const m = metodoNorm;
                if (m.includes('deposit') || m.includes('efect')) metodoPagoFactura = 'Efectivo';
                else if (m.includes('transfer')) metodoPagoFactura = 'Transferencia';
                else if (m.includes('tarjeta') || m.includes('credito') || m.includes('crédito') || m.includes('visa')) metodoPagoFactura = 'Tarjeta';
                else if (m.includes('paypal')) metodoPagoFactura = 'PayPal';
                else metodoPagoFactura = 'pendiente';
            }

            const params = estadoPago === 'pagada' ? [numeroAutorizacion, metodoPagoFactura, subtotalCalc, ivaCalc, totalCalc, id_reservacion, estadoPago, fechaEmisionStr, fechaPagoStr] : [numeroAutorizacion, metodoPagoFactura, subtotalCalc, ivaCalc, totalCalc, id_reservacion, estadoPago, fechaEmisionStr];

            console.log('Factura upsert (createReserva) ->', { pagoObj, pagoConfirmado, estadoPago, numeroAutorizacion, metodoPagoFactura, params });

            await client.query(`
                            INSERT INTO factura (
                                numero_autorizacion_factura, metodo_pago_factura, subtotal_factura, impuestos_factura, total_factura,
                                id_reservacion, estado_pago, fecha_emision_factura${pagoConfirmado ? ', fecha_pago' : ''}
                            ) VALUES (${pagoConfirmado ? '$1,$2,$3,$4,$5,$6,$7,$8,$9' : '$1,$2,$3,$4,$5,$6,$7,$8'})
                            ON CONFLICT (id_reservacion) DO UPDATE SET
                                numero_autorizacion_factura = EXCLUDED.numero_autorizacion_factura,
                                metodo_pago_factura       = EXCLUDED.metodo_pago_factura,
                                subtotal_factura          = EXCLUDED.subtotal_factura,
                                impuestos_factura         = EXCLUDED.impuestos_factura,
                                total_factura             = EXCLUDED.total_factura,
                                estado_pago               = EXCLUDED.estado_pago,
                                fecha_emision_factura     = EXCLUDED.fecha_emision_factura
                                ${pagoConfirmado ? ', fecha_pago = EXCLUDED.fecha_pago' : ''}
                        `, params);

            // 4. Insertar invitados
            console.log('📋 INVITADOS RECIBIDOS en createReserva():', {
                cantidad: invitados?.length || 0,
                primerInvitado: invitados?.[0] || null
            });

            if (Array.isArray(invitados) && invitados.length > 0) {
                let insertadosCount = 0;
                for (const inv of invitados) {
                    try {
                        const nombre = String(inv.nombre || inv.nombre_invitado || '').trim();
                        const email = String(inv.email || inv.email_invitado || '').trim() || null;
                        const telefono = String(inv.telefono || inv.telefono_invitado || '').trim() || null;
                        const acompanantes = Number(inv.acompanantes ?? inv.numero_acompanantes ?? 0) || 0;
                        const notasInv = String(inv.notas || '').trim() || null;

                        if (!nombre) {
                            console.warn(`⚠️ Invitado sin nombre, saltando:`, inv);
                            continue;
                        }

                        console.log(`  💾 Insertando invitado:`, { nombre, email, telefono, acompanantes, notas: notasInv });

                        await client.query(`
                            INSERT INTO invitado (id_evento, nombre, email, telefono, acompanantes, notas)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [id_evento, nombre, email, telefono, acompanantes, notasInv]);

                        insertadosCount++;
                        console.log(`  ✅ Invitado "${nombre}" insertado correctamente`);
                    } catch (invError) {
                        console.error(`❌ ERROR insertando invitado:`, {
                            invitado: inv,
                            error: invError.message
                        });
                        throw invError;
                    }
                }
                console.log(`👥 Total: ${insertadosCount}/${invitados.length} invitados insertados para evento ${id_evento}`);
            } else {
                console.log(`ℹ️ No hay invitados para insertar en createReserva()`);
            }

            // 5. Insertar proveedores del evento con precio calculado (usar esquema real)
            if (proveedoresCalculados.length > 0) {
                for (const prov of proveedoresCalculados) {
                    const start = prov.horaInicio || evento.fechaInicio || evento.fecha_inicio || null;
                    const end = prov.horaFin || evento.fechaFin || evento.fecha_fin || null;

                    const overlapQuery = `
                                                SELECT 1 FROM evento_proveedor ep
                                                WHERE ep.id_proveedor = $1
                                                    AND ep.fecha_inicio_evento IS NOT NULL
                                                    AND ep.fecha_fin_evento IS NOT NULL
                                                    AND ep.fecha_inicio_evento < $3
                                                    AND ep.fecha_fin_evento > $2
                                                LIMIT 1
                                        `;
                    console.log(`Checking provider overlap`, { providerId: prov.id_proveedor, start, end });
                    const overlapRes = await client.query(overlapQuery, [prov.id_proveedor, start, end]);
                    if (overlapRes.rows && overlapRes.rows.length > 0) {
                        const err = new Error(`Proveedor ${prov.id_proveedor} solapa con otro evento en ese periodo`);
                        err.status = 409;
                        err.code = 'PROVIDER_OVERLAP';
                        err.providerId = prov.id_proveedor;
                        throw err;
                    }

                    // Preferir precio enviado por frontend (_precio_calculado) o precioCalculado ya calculado; si no, calcular ahora
                    let precioAplicado;
                    if (prov._precio_calculado != null) {
                        precioAplicado = Number(prov._precio_calculado);
                    } else if (prov.precioCalculado != null) {
                        precioAplicado = Number(prov.precioCalculado);
                    } else {
                        const calcNow = await calcularPrecioProveedor(client, prov, guestCount);
                        precioAplicado = Number(calcNow.precioCalculado || 0);
                        prov.categoriaDb = prov.categoriaDb || (calcNow.categoriaDb || '').toUpperCase();
                        prov.idTipo = prov.idTipo || calcNow.idTipo || null;
                    }

                    await client.query(`
                        INSERT INTO evento_proveedor (
                            id_evento, id_proveedor, id_tipo, precio_acordado,
                            fecha_inicio_evento, fecha_fin_evento
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        id_evento,
                        prov.id_proveedor,
                        prov.idTipo || prov.id_tipo || null,
                        precioAplicado,
                        start,
                        end
                    ]);
                }
            }

            await client.query('COMMIT');

            return {
                id_evento,
                id_reservacion,
                mensaje: 'Reservación creada exitosamente'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    /**
     * Obtener proveedores filtrados por estado y categoría
     */
    getProveedoresFiltrados: async(estado, categoria) => {
        try {
            const where = [];
            const params = [];
            let idx = 1;

            // Forzar solo proveedores activos y aprobados por defecto
            where.push("p.estado = true");
            where.push("p.estado_aprobacion = 'aprobado'");

            if (estado) {
                where.push(`UPPER(p.estado_aprobacion) = $${idx++}`);
                params.push(String(estado).toUpperCase());
            }

            if (categoria) {
                where.push(`UPPER(pt.nombre) = $${idx++}`);
                params.push(String(categoria).toUpperCase());
            }

            const sql = `
                SELECT 
                    p.id_proveedor,
                    p.nombre,
                    COALESCE(pt.nombre, 'OTRO') AS categoria,
                    p.precio_base AS precio,
                    pi.url_imagen AS imagen_proveedor,
                    NULL::text AS imagen1_proveedor,
                    NULL::text AS imagen2_proveedor,
                    NULL::text AS imagen3_proveedor,
                    p.estado_aprobacion AS estado
                FROM proveedor p
                LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
                LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
                ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                ORDER BY p.nombre ASC
            `;

            const result = await db.query(sql, params);
            return result.rows.map(r => ({
                id_proveedor: r.id_proveedor,
                nombre: r.nombre,
                categoria: r.categoria || 'OTRO',
                precio: r.precio || null,
                imagen_proveedor: r.imagen_proveedor || null,
                imagen1_proveedor: r.imagen1_proveedor || null,
                imagen2_proveedor: r.imagen2_proveedor || null,
                imagen3_proveedor: r.imagen3_proveedor || null,
                estado: r.estado
            }));
        } catch (error) {
            console.error('Error en Reserva.getProveedoresFiltrados:', error);
            throw error;
        }
    }
};

module.exports = Reserva;