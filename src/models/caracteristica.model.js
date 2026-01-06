const db = require('../config/db');

exports.findByTipo = async(id_tipo) => {
    const query = `
        SELECT id_caracteristica, id_tipo, nombre, tipo_valor, obligatorio, descripcion
        FROM caracteristica
        WHERE ($1::int IS NULL OR id_tipo = $1) AND (activo IS NULL OR activo = true)
        ORDER BY id_caracteristica ASC
    `;
    const params = [id_tipo === undefined || id_tipo === null || id_tipo === '' ? null : parseInt(id_tipo, 10)];
    const res = await db.query(query, params);
    return res.rows || [];
};

// Devuelve proveedor básico y sus caracteristicas con valores guardados
exports.findByProveedor = async(id_proveedor) => {
    // Obtener proveedor básico
    const provQ = `SELECT id_proveedor, nombre, id_tipo FROM proveedor WHERE id_proveedor = $1`;
    const provRes = await db.query(provQ, [id_proveedor]);
    if (!provRes.rows || provRes.rows.length === 0) return null;
    const proveedor = provRes.rows[0];

    const carQ = `
        SELECT c.id_caracteristica, c.nombre, c.tipo_valor, c.obligatorio,
               pc.valor_texto, pc.valor_numero, pc.valor_booleano, pc.valor_json
        FROM caracteristica c
        LEFT JOIN proveedor_caracteristica pc ON pc.id_caracteristica = c.id_caracteristica AND pc.id_proveedor = $1
        WHERE c.id_tipo = $2 AND (c.activo IS NULL OR c.activo = true)
        ORDER BY c.id_caracteristica ASC
    `;
    const carRes = await db.query(carQ, [id_proveedor, proveedor.id_tipo]);

    return {
        proveedor: {
            id_proveedor: proveedor.id_proveedor,
            nombre: proveedor.nombre,
            id_tipo: proveedor.id_tipo
        },
        caracteristicas: carRes.rows || []
    };
};

module.exports = exports;