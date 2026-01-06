const db = require('../config/db');

exports.getEventoByPlan = async(id_plan) => {
    try {
        console.log('[evento.model] getEventoByPlan:', id_plan);
        const query = `
            SELECT id_evento, nombre_evento, descripcion_evento, fecha_inicio_evento, fecha_fin_evento,
                   id_plan, id_categoria, hay_playlist_evento, playlist_evento, creado_por, id_usuario_creador
            FROM evento
            WHERE id_plan = $1 AND creado_por = 'Administrador'
            LIMIT 1
        `;
        const res = await db.query(query, [id_plan]);
        console.log('[evento.model] resultado:', res.rows[0]);
        return res.rows[0] || null;
    } catch (err) {
        console.error('[evento.model] Error en getEventoByPlan:', err);
        throw err;
    }
};

exports.getEventoById = async(id_evento) => {
    const query = `
        SELECT id_evento, nombre_evento, descripcion_evento, fecha_inicio_evento, fecha_fin_evento,
               id_plan, id_categoria, hay_playlist_evento, playlist_evento, creado_por, id_usuario_creador
        FROM evento
        WHERE id_evento = $1
    `;
    const res = await db.query(query, [id_evento]);
    return res.rows[0] || null;
};

exports.findByUserId = async(userId) => {
    const query = `
        SELECT * FROM evento
        WHERE id_usuario_creador = $1
        ORDER BY fecha_inicio_evento DESC
    `;
    const res = await db.query(query, [userId]);
    return res.rows;
};

exports.getProveedoresByEvento = async(id_evento) => {
    try {
        console.log('[evento.model] getProveedoresByEvento:', id_evento);
        const query = `
            SELECT ep.id_evento, ep.id_proveedor, ep.fecha_inicio_evento, ep.fecha_fin_evento,
                   p.nombre, p.precio_base, pt.nombre as tipo_nombre, pt.id_tipo
            FROM evento_proveedor ep
            JOIN proveedor p ON ep.id_proveedor = p.id_proveedor
            LEFT JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
            WHERE ep.id_evento = $1
        `;
        const res = await db.query(query, [id_evento]);
        console.log('[evento.model] proveedores encontrados:', res.rows.length);
        return res.rows || [];
    } catch (err) {
        console.error('[evento.model] Error en getProveedoresByEvento:', err);
        throw err;
    }
};


exports.createEvento = async(evento) => {
    const query = `
        INSERT INTO evento (
            nombre_evento, descripcion_evento, fecha_inicio_evento, fecha_fin_evento,
            id_plan, id_categoria, hay_playlist_evento, playlist_evento, creado_por, id_usuario_creador
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id_evento
    `;
    const params = [
        evento.nombre_evento,
        evento.descripcion_evento || null,
        evento.fecha_inicio_evento,
        evento.fecha_fin_evento,
        evento.id_plan || null,
        evento.id_categoria || null,
        evento.hay_playlist_evento || false,
        evento.playlist_evento || null,
        evento.creado_por || null,
        evento.id_usuario_creador || null
    ];
    const res = await db.query(query, params);
    return res.rows[0];
};

// Inserta múltiples evento_proveedor y devuelve filas insertadas
exports.createEventoProveedorBatch = async(items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const inserted = [];
        // Antes de insertar, validar solapamientos por proveedor
        for (const it of items) {
            if (it.id_proveedor && it.fecha_inicio_evento && it.fecha_fin_evento) {
                const checkQ = `
                    SELECT id_evento, id_proveedor, fecha_inicio_evento, fecha_fin_evento
                    FROM evento_proveedor
                    WHERE id_proveedor = $1
                      AND NOT (fecha_fin_evento < $2 OR fecha_inicio_evento > $3)
                `;
                const checkRes = await client.query(checkQ, [it.id_proveedor, it.fecha_inicio_evento, it.fecha_fin_evento]);
                if (checkRes.rows && checkRes.rows.length > 0) {
                    const conflict = checkRes.rows[0];
                    const e = new Error(`Solapamiento detectado para proveedor ${it.id_proveedor} con evento ${conflict.id_evento}`);
                    e.code = 'OVERLAP';
                    e.conflict = conflict;
                    throw e;
                }
            }
        }

        // Si pasó validaciones, insertar
        for (const it of items) {
            const q = `
                INSERT INTO evento_proveedor (
                    id_evento, id_proveedor, id_tipo, fecha_inicio_evento, fecha_fin_evento, precio_acordado, estado_asignacion
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                RETURNING *
            `;
            const params = [it.id_evento, it.id_proveedor, it.id_tipo || null, it.fecha_inicio_evento || null, it.fecha_fin_evento || null, it.precio_acordado || null, it.estado_asignacion || null];
            const r = await client.query(q, params);
            inserted.push(r.rows[0]);
        }
        await client.query('COMMIT');
        return inserted;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Inserta múltiples evento_proveedor_caracteristica
exports.createEventoProveedorCaracteristicaBatch = async(items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const inserted = [];
        for (const it of items) {
            // Upsert: si ya existe la combinación (id_evento,id_proveedor,id_caracteristica) actualizar
            const q = `
                INSERT INTO evento_proveedor_caracteristica (
                    id_evento, id_proveedor, id_caracteristica, valor_texto, valor_numero, valor_booleano, valor_json
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT (id_evento, id_proveedor, id_caracteristica) DO UPDATE
                SET valor_texto = EXCLUDED.valor_texto,
                    valor_numero = EXCLUDED.valor_numero,
                    valor_booleano = EXCLUDED.valor_booleano,
                    valor_json = EXCLUDED.valor_json
                RETURNING *
            `;
            const params = [it.id_evento, it.id_proveedor, it.id_caracteristica, it.valor_texto || null, it.valor_numero || null, it.valor_booleano || null, it.valor_json || null];
            const r = await client.query(q, params);
            inserted.push(r.rows[0]);
        }
        await client.query('COMMIT');
        return inserted;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = exports;