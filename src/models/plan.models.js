const db = require('../config/db');

/**
 * Obtener todos los planes disponibles
 */
exports.findAll = async() => {
    const query = `
        SELECT *
        FROM plan
        ORDER BY id_plan ASC
    `;
    console.log('[PlanModel] Ejecutando query findAll:', query.replace(/\s+/g, ' ').trim());
    const result = await db.query(query);
    return result.rows;
};

/**
 * Obtener un plan por ID
 */
exports.findById = async(id) => {
    const query = `
        SELECT *
        FROM plan
        WHERE id_plan = $1
    `;
    console.log('[PlanModel] Ejecutando query findById:', query.replace(/\s+/g, ' ').trim(), 'params:', [id]);
    const result = await db.query(query, [id]);
    return result.rows[0];
};