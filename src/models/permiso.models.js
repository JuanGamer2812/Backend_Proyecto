const pool = require('../config/db');

exports.deleteById = async(id) => {
    const sql = 'DELETE FROM permiso WHERE id_permiso = $1 RETURNING *';
    const result = await pool.query(sql, [id]);
    return result.rows[0] || null;
};