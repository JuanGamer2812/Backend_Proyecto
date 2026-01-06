const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/categoria.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * Rutas para Categorías desde proveedor_tipo
 * Base: /api/categorias
 */

// GET /api/categorias - Público, no requiere token
router.get('/', CategoriaController.getCategorias);

module.exports = router;