const db = require('../config/db');

// Obtener todos los proveedores para el home
exports.findAll = async () => {
    const result = await db.query('SELECT * FROM v_listar_proveedor_home');
    return result.rows;
};

// Obtener proveedores por categoría
exports.findByCategoria = async (categoria) => {
    const query = `
        SELECT * FROM v_listar_proveedor_home 
        WHERE "Categoria" = $1
    `;
    const result = await db.query(query, [categoria]);
    return result.rows;
};
