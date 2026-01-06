const express = require('express');
const router = express.Router();
const controller = require('../controllers/v_proveedor_home.controller');

// GET /api/v_proveedor_home - Obtener todos los proveedores para el home
router.get('/', controller.getAll);

// GET /api/v_proveedor_home/categoria/:categoria - Obtener por categoría
router.get('/categoria/:categoria', controller.getByCategoria);

module.exports = router;
