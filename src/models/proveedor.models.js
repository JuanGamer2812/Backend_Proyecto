const db = require('../config/db');

// Helper: Normalizar valores de hora a formato TIME (HH:MM:SS)
const normalizeTimeValue = (value) => {
    if (!value) return '00:00:00';

    // Si ya está en formato correcto (HH:MM:SS o HH:MM), retornar
    if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        // Si falta segundos, agregarlos
        return value.includes(':') && !value.match(/:\d{2}:\d{2}$/) ? `${value}:00` : value;
    }

    // Si es un número simple (9, 22, etc.), convertir a HH:00:00
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 23) {
        return `${String(numValue).padStart(2, '0')}:00:00`;
    }

    // Default fallback
    return '00:00:00';
};

// Obtener todos los proveedores con estructura normalizada para administración
exports.findAll = async() => {
    const query = `
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.precio_base,
            p.estado,
            p.descripcion,
            p.id_tipo,
            pt.nombre AS tipo_nombre,
            p.estado_aprobacion,
            p.razon_rechazo AS motivo_rechazo,
            p.verificado,
            NULL::text AS correo
        FROM proveedor p
        LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
        ORDER BY p.nombre ASC
    `;

    const result = await db.query(query);
    return result.rows;
};

// Obtener proveedores con filtros opcionales (estado, categoría)
exports.findByEstado = async(estado, categoria) => {
    let query = `
           SELECT 
              p.id_proveedor,
              p.nombre,
              pt.nombre AS categoria,
              p.descripcion,
              p.precio_base,
              p.estado_aprobacion AS estado,
              COALESCE(p.activo, true) AS activo,
              p.id_plan,
              pl.nombre_plan AS plan,
              pi.url_imagen AS imagen_proveedor,
              NULL::text AS imagen1_proveedor,
              NULL::text AS imagen2_proveedor,
              NULL::text AS imagen3_proveedor
           FROM proveedor p
           LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
           LEFT JOIN plan pl ON p.id_plan = pl.id_plan
           LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
           WHERE 1=1
        `;

    const params = [];
    let paramCount = 1;

    // Filtro por estado
    if (estado) {
        query += ` AND p.estado_aprobacion = $${paramCount}`;
        params.push(estado);
        paramCount++;
    }

    // Filtro por categoría (nombre de proveedor_tipo)
    if (categoria) {
        query += ` AND pt.nombre ILIKE $${paramCount}`;
        params.push(categoria);
        paramCount++;
    }

    query += ' ORDER BY p.nombre ASC';

    const result = await db.query(query, params);
    return result.rows;
};

// Obtener proveedores con múltiples filtros (verificado, estado_aprobacion, etc.)
exports.findByFilters = async(filters) => {
    let query = `
       SELECT 
          p.id_proveedor,
          p.nombre,
          pt.nombre AS categoria,
          p.descripcion,
          p.precio_base,
          p.estado_aprobacion AS estado,
          COALESCE(p.activo, true) AS activo,
          p.id_plan,
          pl.nombre_plan AS plan,
          pi.url_imagen AS imagen_proveedor,
          NULL::text AS imagen1_proveedor,
          NULL::text AS imagen2_proveedor,
          NULL::text AS imagen3_proveedor
       FROM proveedor p
       LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
       LEFT JOIN plan pl ON p.id_plan = pl.id_plan
       LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
       WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters) {
        if (filters.estado_aprobacion !== undefined && filters.estado_aprobacion !== null && filters.estado_aprobacion !== '') {
            query += ` AND UPPER(p.estado_aprobacion) = $${paramCount++}`;
            params.push(String(filters.estado_aprobacion).toUpperCase());
        }
        if (filters.verificado !== undefined && filters.verificado !== null && filters.verificado !== '') {
            query += ` AND p.verificado = $${paramCount++}`;
            params.push(filters.verificado);
        }
        if (filters.id_tipo !== undefined && filters.id_tipo !== null && filters.id_tipo !== '') {
            query += ` AND p.id_tipo = $${paramCount++}`;
            params.push(parseInt(filters.id_tipo, 10));
        }
        if (filters.id_plan !== undefined && filters.id_plan !== null && filters.id_plan !== '') {
            query += ` AND p.id_plan = $${paramCount++}`;
            params.push(parseInt(filters.id_plan, 10));
        }
        if (filters.nombre) {
            query += ` AND p.nombre ILIKE $${paramCount++}`;
            params.push(`%${filters.nombre}%`);
        }
    }

    query += ' ORDER BY p.nombre ASC';

    const result = await db.query(query, params);
    return result.rows;
};

// Obtener proveedores públicos (solo verificados y aprobados para /colaboradores)
exports.findPublicos = async() => {
    const query = `
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.precio_base,
            p.estado,
            p.descripcion,
            p.id_tipo,
            pt.nombre AS tipo_nombre,
            p.estado_aprobacion,
            p.verificado,
            NULL::text AS correo
        FROM proveedor p
        LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
        WHERE p.verificado = true 
          AND p.estado_aprobacion = 'aprobado'
        ORDER BY p.nombre ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

// Obtener proveedores públicos con filtros por estado_aprobacion y categoría (case-insensitive)
exports.findPublicosFiltrados = async({ estado, categoria, id_plan }) => {
    const where = ["p.estado = true"];
    const params = [];
    let idx = 1;

    // Si no se envía estado, por defecto solo aprobados
    if (!estado) {
        where.push("p.estado_aprobacion = 'aprobado'");
    }

    if (estado) {
        where.push(`UPPER(p.estado_aprobacion) = $${idx++}`);
        params.push(String(estado).toUpperCase());
    }

    if (categoria) {
        where.push(`UPPER(pt.nombre) = $${idx++}`);
        params.push(String(categoria).toUpperCase());
    }

    if (id_plan !== undefined && id_plan !== null && id_plan !== '') {
        where.push(`p.id_plan = $${idx++}`);
        params.push(parseInt(id_plan, 10));
    }

    const query = `
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.precio_base,
            p.estado,
            p.descripcion,
            UPPER(COALESCE(pt.nombre, 'OTRO')) AS categoria,
            p.precio_base AS precio,
            pi.url_imagen AS imagen_proveedor,
            NULL::text AS imagen1_proveedor,
            NULL::text AS imagen2_proveedor,
            NULL::text AS imagen3_proveedor,
            UPPER(p.estado_aprobacion) AS estado_aprobacion
        FROM proveedor p
        LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
        LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY p.nombre ASC
    `;

    const result = await db.query(query, params);
    return result.rows;
};

// Nuevo: Obtener listado público avanzado con imágenes agregadas y paginación
exports.findListadoPublicoAdvanced = async({ estado_aprobacion = null, estado = null, id_plan = null, id_tipo = null, categoria = null, limit = 100, offset = 0 }) => {
    const query = `
                SELECT
                    p.id_proveedor,
                    p.nombre,
                    p.descripcion,
                    p.precio_base,
                    p.id_plan,
                    p.id_tipo,
                    pt.nombre AS nombre_tipo,
                    p.estado,
                    p.estado_aprobacion,
                    COALESCE(pi_principal.url_imagen, NULL) AS imagen_proveedor,
                    COALESCE(ARRAY_REMOVE(ARRAY_AGG(pi.url_imagen ORDER BY pi.orden), NULL), ARRAY[]::text[]) AS imagenes
                FROM proveedor p
                LEFT JOIN proveedor_tipo pt ON pt.id_tipo = p.id_tipo
                LEFT JOIN proveedor_imagen pi_principal ON pi_principal.id_proveedor = p.id_proveedor AND pi_principal.es_principal = true
                LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.activo = true
                WHERE
                    ($1::text IS NULL OR p.estado_aprobacion = $1::text)
                    AND ($2::boolean IS NULL OR p.estado = $2::boolean)
                    AND ($3::text IS NULL OR p.id_plan::text = $3::text)
                    AND ($4::int IS NULL OR p.id_tipo = $4::int)
                      AND ($5::text IS NULL OR upper(pt.nombre::text) = upper($5::text))
                GROUP BY p.id_proveedor, pt.nombre, pi_principal.url_imagen
                ORDER BY p.id_proveedor DESC
                LIMIT COALESCE(NULLIF($6::int,0), 100)
                OFFSET COALESCE($7::int, 0);
        `;

    const params = [
        estado_aprobacion === undefined ? null : estado_aprobacion,
        estado === undefined ? null : estado,
        id_plan === undefined ? null : id_plan,
        id_tipo === undefined ? null : id_tipo,
        categoria === undefined ? null : categoria,
        limit === undefined ? null : limit,
        offset === undefined ? null : offset
    ];

    const result = await db.query(query, params);
    return result.rows;
};

// Obtener proveedores por categoría (si es necesario)
exports.findByCategoria = async(categoria) => {
    const query = `
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.precio_base,
            p.estado,
            p.descripcion,
            p.id_tipo,
            pt.nombre AS tipo_nombre,
            p.estado_aprobacion,
            p.razon_rechazo AS motivo_rechazo,
            NULL::text AS correo
        FROM proveedor p
        LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
        WHERE p.estado_aprobacion = 'aprobado'
          AND p.estado = true
          AND (pt.nombre ILIKE $1 OR $1 IS NULL)
        ORDER BY p.nombre ASC
    `;
    const result = await db.query(query, [categoria || null]);
    return result.rows;
};

// Obtener proveedor por ID con información completa
exports.findById = async(id) => {
    const query = `
        SELECT 
            p.id_proveedor,
            p.nombre,
            p.precio_base,
            p.estado,
            p.descripcion,
            p.id_plan,
            p.id_tipo,
            UPPER(p.estado_aprobacion) AS estado_aprobacion,
            p.fecha_aprobacion,
            p.aprobado_por,
            p.razon_rechazo,
            UPPER(pt.nombre) AS tipo_nombre,
            pt.descripcion_tipo,
            pl.nombre_plan,
            pl.descripcion as plan_descripcion,
            -- Campos de música (no JOIN para evitar error si tablas opcionales no existen)
            NULL::text AS genero,
            NULL::boolean AS por_hora,
            NULL::time AS hora_inicio,
            NULL::time AS hora_fin,
            -- Campos de catering
            NULL::text AS tipo_comida,
            NULL::text AS menu,
            -- Campos de lugar
            NULL::int AS capacidad,
            NULL::text AS direccion,
            NULL::text as lugar_descripcion,
            NULL::boolean AS seguridad,
            -- Campos de decoración
            NULL::text AS nivel,
            NULL::text AS pdf_catalogo,
            pi.url_imagen AS imagen_proveedor,
            NULL::text AS imagen1_proveedor,
            NULL::text AS imagen2_proveedor,
            NULL::text AS imagen3_proveedor
        FROM proveedor p
        LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
        LEFT JOIN plan pl ON p.id_plan = pl.id_plan
        LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
        -- Note: provider-specific tables (proveedor_musica, proveedor_catering, proveedor_lugar,
        -- proveedor_decoracion) are optional in some deployments. To avoid query failures when
        -- those relations are absent, we do not join them here and return NULL placeholders above.
        WHERE p.id_proveedor = $1
    `;

    const result = await db.query(query, [id]);

    // DEBUG: imprimir resultado crudo y el campo proveedor_imagen
    try {
        const proveedor = result.rows && result.rows[0] ? result.rows[0] : null;
        console.log('[DEBUG] proveedor id=', id, 'proveedor_imagen rows =', proveedor ? proveedor.proveedor_imagen : proveedor);
        console.log('[DEBUG] raw query result (rows) =', result.rows);
    } catch (dbgErr) {
        console.log('[DEBUG] error al loguear proveedor_imagen:', dbgErr);
    }

    return result.rows[0];
};

// Nuevo: Obtener proveedor por ID incluyendo arreglo de imágenes como JSON
exports.findByIdWithImages = async(id) => {
    const sql = `
                SELECT p.*,
                    pl.nombre_plan,
                    pl.descripcion AS plan_descripcion,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id_proveedor_imagen', pi.id_proveedor_imagen,
                                'id_proveedor', pi.id_proveedor,
                                'url_imagen', pi.url_imagen,
                                'es_principal', pi.es_principal,
                                'orden', pi.orden,
                                'activo', pi.activo
                            ) ORDER BY pi.es_principal DESC, pi.orden ASC, pi.id_proveedor_imagen ASC
                        ) FILTER (WHERE pi.id_proveedor_imagen IS NOT NULL),
                        '[]'
                    ) AS proveedor_imagen
                FROM proveedor p
                LEFT JOIN plan pl ON p.id_plan = pl.id_plan
                LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.activo = TRUE
                WHERE p.id_proveedor = $1
                GROUP BY p.id_proveedor, pl.nombre_plan, pl.descripcion;
        `;

    const res = await db.query(sql, [id]);
    return (res.rows && res.rows.length) ? res.rows[0] : null;
};

// Actualizar proveedor
exports.update = async(id, data) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Actualizar tabla principal proveedor
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        // Validaciones de estado_aprobacion
        if (data.estado_aprobacion !== undefined) {
            const allowed = ['pendiente', 'aprobado', 'rechazado', 'suspendido'];
            if (!allowed.includes(data.estado_aprobacion)) {
                throw new Error('estado_aprobacion inválido');
            }
        }

        if (data.nombre !== undefined) {
            updateFields.push(`nombre = $${paramCount++}`);
            updateValues.push(data.nombre);
        }
        if (data.precio_base !== undefined) {
            updateFields.push(`precio_base = $${paramCount++}`);
            updateValues.push(data.precio_base);
        }
        if (data.estado !== undefined) {
            updateFields.push(`estado = $${paramCount++}`);
            updateValues.push(data.estado);
        }
        if (data.descripcion !== undefined) {
            updateFields.push(`descripcion = $${paramCount++}`);
            updateValues.push(data.descripcion);
        }
        if (data.id_plan !== undefined && data.id_plan !== null && data.id_plan !== '') {
            updateFields.push(`id_plan = $${paramCount++}`);
            updateValues.push(parseInt(data.id_plan));
        }
        if (data.verificado !== undefined) {
            updateFields.push(`verificado = $${paramCount++}`);
            updateValues.push(data.verificado);
        }
        if (data.aprobado_por !== undefined) {
            updateFields.push(`aprobado_por = $${paramCount++}`);
            updateValues.push(data.aprobado_por);
        }
        if (data.estado_aprobacion !== undefined) {
            updateFields.push(`estado_aprobacion = $${paramCount++}`);
            updateValues.push(data.estado_aprobacion);

            // Manejo de razón de rechazo
            const motivoRechazo = data.razon_rechazo || data.motivo_rechazo;

            if (data.estado_aprobacion === 'rechazado') {
                // Obligatorio razon_rechazo
                if (!motivoRechazo || String(motivoRechazo).trim() === '') {
                    throw new Error('razon_rechazo requerido para estado_aprobacion=rechazado');
                }
                updateFields.push(`razon_rechazo = $${paramCount++}`);
                updateValues.push(motivoRechazo);
            } else if (data.estado_aprobacion === 'suspendido') {
                // Obligatorio razon_rechazo para suspendidos
                if (!motivoRechazo || String(motivoRechazo).trim() === '') {
                    throw new Error('razon_rechazo requerido para estado_aprobacion=suspendido');
                }
                updateFields.push(`razon_rechazo = $${paramCount++}`);
                updateValues.push(motivoRechazo);
            } else if (data.estado_aprobacion === 'aprobado') {
                // Limpiar razón de rechazo si aprueban
                updateFields.push(`razon_rechazo = $${paramCount++}`);
                updateValues.push(null);
            }
        } else if (data.razon_rechazo !== undefined) {
            // Permitir actualizar razon_rechazo independientemente
            updateFields.push(`razon_rechazo = $${paramCount++}`);
            updateValues.push(data.razon_rechazo);
        }

        if (updateFields.length > 0) {
            updateValues.push(id);
            const updateQuery = `
                UPDATE proveedor 
                SET ${updateFields.join(', ')}
                WHERE id_proveedor = $${paramCount}
                RETURNING *
            `;
            await client.query(updateQuery, updateValues);
        }

        // ========================================================================
        // No hay lógica hardcodeada por tipo - todo es dinámico vía caracteristicas
        // ========================================================================

        await client.query('COMMIT');

        // Retornar proveedor actualizado con datos normalizados
        const selectQuery = `
            SELECT 
                p.id_proveedor,
                p.nombre,
                p.precio_base,
                p.estado,
                p.descripcion,
                p.id_tipo,
                pt.nombre AS tipo_nombre,
                p.estado_aprobacion,
                p.razon_rechazo AS motivo_rechazo,
                p.verificado,
                NULL::text AS correo
            FROM proveedor p
            LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
            WHERE p.id_proveedor = $1
        `;
        const result = await client.query(selectQuery, [id]);

        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Eliminar proveedor
exports.delete = async(id) => {
    const result = await db.query(
        'DELETE FROM proveedor WHERE id_proveedor = $1 RETURNING *', [id]
    );
    return result.rows[0];
};

// Crear nuevo proveedor con datos por categoría
exports.create = async(data) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Insertar en tabla proveedor
        const insertProveedorQuery = `
            INSERT INTO proveedor (
                nombre,
                precio_base,
                descripcion,
                id_plan,
                id_tipo,
                estado,
                estado_aprobacion,
                verificado,
                razon_rechazo,
                aprobado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id_proveedor
        `;
        const proveedorResult = await client.query(insertProveedorQuery, [
            data.nom_empresa_proveedor,
            data.precio || 0,
            data.descripcion || null,
            data.id_plan,
            data.id_tipo,
            true,
            data.estado_aprobacion || 'pendiente',
            data.verificado || false,
            data.razon_rechazo || null,
            data.aprobado_por || null
        ]);

        const id_proveedor = proveedorResult.rows[0].id_proveedor;

        // ========================================================================
        // INSERCIÓN DINÁMICA DE CARACTERÍSTICAS
        // El front envía un arreglo con las características del tipo/categoría
        // ========================================================================
        const caracteristicas = Array.isArray(data.caracteristicas) ? data.caracteristicas : [];

        for (const item of caracteristicas) {
            const idCaracteristica = parseInt(item.id_caracteristica || item.idCaracteristica, 10);
            if (!idCaracteristica || Number.isNaN(idCaracteristica)) continue;

            const valorOriginal = item.valor_texto ?? item.valor_numero ?? item.valor_booleano ?? item.valor_json ?? item.valor;

            console.log('[PROVEEDOR][CREATE-MODEL] Procesando característica:', {
                idCaracteristica,
                valorOriginal,
                tipo: typeof valorOriginal
            });

            let valorTexto = null;
            let valorNumero = null;
            let valorBooleano = null;
            let valorJson = null;

            if (item.valor_json !== undefined) {
                valorJson = item.valor_json;
            } else if (typeof valorOriginal === 'boolean') {
                valorBooleano = valorOriginal;
            } else if (typeof valorOriginal === 'number' || !isNaN(Number(valorOriginal))) {
                valorNumero = Number(valorOriginal);
                valorTexto = String(valorOriginal);
            } else if (valorOriginal !== undefined && valorOriginal !== null) {
                valorTexto = String(valorOriginal);
            }

            const upsertQuery = `
                INSERT INTO proveedor_caracteristica 
                    (id_proveedor, id_caracteristica, valor_texto, valor_numero, valor_booleano, valor_json, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (id_proveedor, id_caracteristica) 
                DO UPDATE SET 
                    valor_texto = EXCLUDED.valor_texto,
                    valor_numero = EXCLUDED.valor_numero,
                    valor_booleano = EXCLUDED.valor_booleano,
                    valor_json = EXCLUDED.valor_json,
                    updated_at = NOW()
            `;
            await client.query(upsertQuery, [id_proveedor, idCaracteristica, valorTexto, valorNumero, valorBooleano, valorJson]);
        }

        // Insertar imágenes si llegaron desde el front
        const imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];
        console.log('[PROVEEDOR-MODEL] Imágenes recibidas:', JSON.stringify(imagenes, null, 2));

        for (let i = 0; i < imagenes.length; i++) {
            const img = imagenes[i] || {};
            let url = img.url_imagen || img.url || img.filename;
            if (!url) continue;

            // Si solo viene el nombre de archivo, anteponer la ruta pública esperada
            const isPlainFilename = !url.includes('/') && !url.startsWith('http');
            if (isPlainFilename) {
                url = `/uploads/${url}`;
            }

            // Usar SOLO el valor es_principal que viene del controller
            const esPrincipal = img.es_principal === true;
            const orden = img.orden ? parseInt(img.orden, 10) : (i + 1);

            console.log(`[PROVEEDOR-MODEL] Insertando imagen ${i}: url=${url}, es_principal=${esPrincipal}, orden=${orden}`);

            await client.query(
                `INSERT INTO proveedor_imagen (id_proveedor, url_imagen, es_principal, orden, activo)
                 VALUES ($1, $2, $3, $4, TRUE)`, [id_proveedor, url, esPrincipal, orden]
            );
        }

        await client.query('COMMIT');

        // Retornar proveedor creado
        const selectQuery = `
            SELECT 
                p.id_proveedor,
                p.nombre,
                p.precio_base,
                p.estado,
                p.descripcion,
                p.estado_aprobacion,
                p.razon_rechazo,
                p.verificado,
                p.aprobado_por
            FROM proveedor p
            WHERE p.id_proveedor = $1
        `;
        const result = await client.query(selectQuery, [id_proveedor]);

        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ========================================================================
//  🆕 NUEVO MÉTODO: Obtener proveedor con características desde tabla relacionada
// ========================================================================
exports.findByIdWithCaracteristicas = async(id) => {
    const client = await db.connect();
    try {
        // Obtener datos básicos del proveedor
        const proveedorQuery = `
            SELECT 
                p.id_proveedor,
                p.nombre,
                p.precio_base,
                p.estado,
                p.descripcion,
                p.id_tipo,
                p.id_plan,
                pt.nombre AS tipo_nombre,
                pl.nombre_plan,
                p.estado_aprobacion,
                p.razon_rechazo,
                p.verificado,
                p.aprobado_por,
                p.fecha_aprobacion,
                p.fecha_registro
            FROM proveedor p
            LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
            LEFT JOIN plan pl ON p.id_plan = pl.id_plan
            WHERE p.id_proveedor = $1
        `;
        const proveedorResult = await client.query(proveedorQuery, [id]);

        if (proveedorResult.rows.length === 0) {
            return null;
        }

        const proveedor = proveedorResult.rows[0];

        // Obtener características específicas del proveedor
        const caracteristicasQuery = `
            SELECT 
                c.nombre,
                c.tipo_valor,
                pc.valor_texto,
                pc.valor_numero,
                pc.valor_booleano,
                pc.valor_json
            FROM proveedor_caracteristica pc
            JOIN caracteristica c ON pc.id_caracteristica = c.id_caracteristica
            WHERE pc.id_proveedor = $1
        `;
        const caracteristicasResult = await client.query(caracteristicasQuery, [id]);

        // Importar makeAbsoluteUrl para convertir rutas de archivos
        const { makeAbsoluteUrl } = require('../utils/url.util');

        // Mapear características a campos específicos según el tipo de proveedor
        const caracteristicas = {};
        caracteristicasResult.rows.forEach(row => {
            let valor = row.valor_texto || row.valor_numero || row.valor_booleano || row.valor_json;

            // Si el valor parece ser una ruta de archivo, convertir a URL absoluta
            if (valor && typeof valor === 'string') {
                // Si ya es URL absoluta, dejar tal cual
                if (valor.startsWith('http://') || valor.startsWith('https://')) {
                    // Ya es absoluta, no hacer nada
                }
                // Si empieza con /uploads/, convertir a absoluta
                else if (valor.startsWith('/uploads/')) {
                    valor = makeAbsoluteUrl(valor);
                }
                // Si parece ser un nombre de archivo (tiene extensión de archivo), añadir prefijo y convertir
                else if (valor.match(/\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx)$/i)) {
                    valor = makeAbsoluteUrl(`/uploads/${valor}`);
                }
            }

            // Mapeo de nombres de características a nombres de campos del formulario
            const fieldMap = {
                'Tipo de menú': 'tipo_comida',
                'Platos incluidos': 'platos_incluidos',
                'Bocaditos incluidos': 'bocaditos_incluidos',
                'Incluye bebidas no alcohólicas': 'incluye_bebidas',
                'Incluye torta': 'incluye_torta',
                'Personal de servicio': 'personal_servicio',
                'Horas de música': 'horas_musica',
                'Incluye sonido': 'incluye_sonido',
                'Incluye iluminación': 'incluye_iluminacion',
                'Géneros / Playlist': 'generos_playlist',
                'Micrófonos incluidos': 'microfonos_incluidos',
                'Tema de decoración': 'tema_decoracion',
                'Centros de mesa': 'centros_mesa',
                'Arco floral': 'arco_floral',
                'Flores naturales': 'flores_naturales',
                'Capacidad del lugar': 'capacidad_personas',
                'Dirección': 'direccion_lugar',
                'Parqueadero': 'parqueadero',
                'Incluye mesas y sillas': 'incluye_mobiliario',
                'Hora máxima': 'hora_maxima',
                'Cantidad de fotos': 'cantidad_fotos',
                'Incluye video': 'incluye_video',
                'Duración del video': 'duracion_video',
                'Entrega en días': 'entrega_dias',
                'Álbum físico': 'album_fisico'
            };

            const fieldName = fieldMap[row.nombre] || row.nombre.toLowerCase().replace(/ /g, '_');
            caracteristicas[fieldName] = valor;
        });

        // Retornar proveedor con características aplanadas
        return {
            ...proveedor,
            ...caracteristicas
        };

    } finally {
        client.release();
    }
};

// ========================================================================
//  🆕 NUEVO MÉTODO: Actualizar proveedor CON características
// ========================================================================
exports.updateWithCaracteristicas = async(id, data) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Actualizar datos básicos en tabla proveedor
        const basicFields = [];
        const basicValues = [];
        let paramCount = 1;

        const basicFieldsMap = {
            nombre: 'nombre',
            descripcion: 'descripcion',
            precio_base: 'precio_base',
            estado: 'estado',
            id_plan: 'id_plan'
        };

        for (const [field, column] of Object.entries(basicFieldsMap)) {
            if (data[field] !== undefined) {
                basicFields.push(`${column} = $${paramCount++}`);
                basicValues.push(data[field]);
            }
        }

        if (basicFields.length > 0) {
            basicValues.push(id);
            const updateQuery = `
                UPDATE proveedor 
                SET ${basicFields.join(', ')}
                WHERE id_proveedor = $${paramCount}
            `;
            await client.query(updateQuery, basicValues);
        }

        // 2. Mapeo de campos del formulario a id_caracteristica
        const caracteristicasMap = {
            tipo_comida: 3,
            platos_incluidos: 1,
            bocaditos_incluidos: 2,
            incluye_bebidas: 4,
            incluye_torta: 5,
            personal_servicio: 6,
            horas_musica: 7,
            incluye_sonido: 8,
            incluye_iluminacion: 9,
            generos_playlist: 10,
            microfonos_incluidos: 11,
            tema_decoracion: 12,
            centros_mesa: 13,
            arco_floral: 14,
            flores_naturales: 15,
            capacidad_personas: 16,
            direccion_lugar: 17,
            parqueadero: 18,
            incluye_mobiliario: 19,
            hora_maxima: 20,
            cantidad_fotos: 21,
            incluye_video: 22,
            duracion_video: 23,
            entrega_dias: 24,
            album_fisico: 25
        };

        // 3. Actualizar/insertar características en proveedor_caracteristica
        for (const [campo, idCaracteristica] of Object.entries(caracteristicasMap)) {
            if (data[campo] !== undefined && data[campo] !== null && data[campo] !== '') {
                const valorOriginal = data[campo];

                let valorTexto = null;
                let valorNumero = null;
                let valorBooleano = null;

                if (typeof valorOriginal === 'boolean') {
                    valorBooleano = valorOriginal;
                } else if (typeof valorOriginal === 'number' || !isNaN(Number(valorOriginal))) {
                    valorNumero = Number(valorOriginal);
                    valorTexto = String(valorOriginal);
                } else {
                    valorTexto = String(valorOriginal);
                }

                const upsertQuery = `
                    INSERT INTO proveedor_caracteristica 
                        (id_proveedor, id_caracteristica, valor_texto, valor_numero, valor_booleano, updated_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (id_proveedor, id_caracteristica) 
                    DO UPDATE SET 
                        valor_texto = EXCLUDED.valor_texto,
                        valor_numero = EXCLUDED.valor_numero,
                        valor_booleano = EXCLUDED.valor_booleano,
                        updated_at = NOW()
                `;
                await client.query(upsertQuery, [id, idCaracteristica, valorTexto, valorNumero, valorBooleano]);
            }
        }

        await client.query('COMMIT');

        return await exports.findByIdWithCaracteristicas(id);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en updateWithCaracteristicas:', error);
        throw error;
    } finally {
        client.release();
    }
};

// ========================================================================
//  🆕 NUEVO MÉTODO: Eliminar proveedor con cascade manual
// ========================================================================
exports.deleteWithRelations = async(id) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Eliminar de evento_proveedor
        await client.query('DELETE FROM evento_proveedor WHERE id_proveedor = $1', [id]);

        // 2. Eliminar de proveedor_caracteristica
        await client.query('DELETE FROM proveedor_caracteristica WHERE id_proveedor = $1', [id]);

        // 3. Verificar y eliminar de tablas opcionales
        const imagenTableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'proveedor_imagen'
            )
        `);
        if (imagenTableExists.rows[0].exists) {
            await client.query('DELETE FROM proveedor_imagen WHERE id_proveedor = $1', [id]);
        }

        // 4. Finalmente eliminar el proveedor
        const result = await client.query(
            'DELETE FROM proveedor WHERE id_proveedor = $1 RETURNING *', [id]
        );

        await client.query('COMMIT');

        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en deleteWithRelations:', error);
        throw error;
    } finally {
        client.release();
    }
};
