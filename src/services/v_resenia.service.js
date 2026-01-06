const VResenia = require('../models/v_resenia.models');

/**
 * Servicio para la vista v_listar_resenia
 */

const VReseniaService = {
    /**
     * Obtener todas las reseñas
     */
    getAllResenias: async() => {
        return await VResenia.getAll();
    },

    /**
     * Obtener reseñas por calificación
     */
    getReseniasByCalificacion: async(calificacion) => {
        try {
            const cal = parseInt(calificacion);
            if (isNaN(cal) || cal < 1 || cal > 5) {
                throw new Error('La calificación debe ser un número entre 1 y 5');
            }
            return await VResenia.getByCalificacion(cal);
        } catch (error) {
            console.error('Error en VReseniaService.getReseniasByCalificacion:', error);
            throw error;
        }
    }
};

module.exports = VReseniaService;