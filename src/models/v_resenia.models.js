const pool = require('../config/db');

/**
 * Modelo para la vista v_listar_resenia
 * Obtiene reseñas con información del usuario
 */

const VResenia = {
    /**
     * Obtener todas las reseñas
     */
    getAll: async() => {
        const query = 'SELECT * FROM v_listar_resenia';
        const result = await pool.query(query);
        return result.rows;
    },

    /**
     * Obtener reseñas por calificación
     */
    getByCalificacion: async(calificacion) => {
        const query = 'SELECT * FROM v_listar_resenia WHERE "Calificacion" = $1';
        const result = await pool.query(query, [calificacion]);
        return result.rows;
    }
};

module.exports = VResenia;