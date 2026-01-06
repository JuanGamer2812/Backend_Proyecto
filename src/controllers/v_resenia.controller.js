const VReseniaService = require('../services/v_resenia.service');

/**
 * Controlador para la vista v_listar_resenia
 */

const VReseniaController = {
  /**
   * GET /api/v_resenia
   * Obtener todas las reseñas
   */
  getAll: async (req, res) => {
    try {
      const resenias = await VReseniaService.getAllResenias();
      res.status(200).json(resenias);
    } catch (error) {
      console.error('Error en VReseniaController.getAll:', error);
      res.status(500).json({ 
        error: 'Error al obtener las reseñas',
        details: error.message 
      });
    }
  },

  /**
   * GET /api/v_resenia/calificacion/:calificacion
   * Obtener reseñas por calificación
   */
  getByCalificacion: async (req, res) => {
    try {
      const { calificacion } = req.params;
      const resenias = await VReseniaService.getReseniasByCalificacion(calificacion);
      res.status(200).json(resenias);
    } catch (error) {
      console.error('Error en VReseniaController.getByCalificacion:', error);
      res.status(400).json({ 
        error: 'Error al obtener las reseñas',
        details: error.message 
      });
    }
  }
};

module.exports = VReseniaController;
