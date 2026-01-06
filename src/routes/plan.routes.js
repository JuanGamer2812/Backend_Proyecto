const express = require('express');
const router = express.Router();
const controller = require('../controllers/plan.controller');

/**
 * Rutas para Planes
 * Base: /api/planes
 */

// GET /api/planes - Obtener todos los planes (público)
router.get('/', controller.getAll);

// GET /api/planes/:id - Obtener un plan por ID (público)
router.get('/:id', controller.getById);

module.exports = router;