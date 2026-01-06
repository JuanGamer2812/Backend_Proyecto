const db = require('../config/db');

exports.findAll = async () => {
    const result = await db.query('SELECT * FROM v_listar_rol_permiso');
    return result.rows;
};
