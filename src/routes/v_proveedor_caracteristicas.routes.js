const express = require('express');
const router = express.Router();
const controller = require('../controllers/v_proveedor_caracteristicas.controller');

// GET /api/v_proveedor_caracteristicas?id_proveedor=<id>
router.get('/', controller.getByProveedor);

module.exports = router;