const express = require('express');
const router = express.Router();
const VReseniaController = require('../controllers/v_resenia.controller');

/**
 * Rutas para la vista v_listar_resenia
 * Base: /api/v_resenia
 */

// GET /api/v_resenia - Obtener todas las reseñas
router.get('/', VReseniaController.getAll);

// GET /api/v_resenia/calificacion/:calificacion - Obtener reseñas por calificación
router.get('/calificacion/:calificacion', VReseniaController.getByCalificacion);

module.exports = router;
