const db = require('../config/db');

exports.findAll = async () => {
    const result = await db.query('SELECT * FROM v_listar_usuario');
    return result.rows;
};