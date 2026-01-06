const express = require('express');
const router = express.Router();
const controller = require('../controllers/caracteristica.controller');

// GET /api/caracteristica?tipo={id_tipo}
router.get('/', controller.getByTipo);

// GET /api/proveedor/:id/caracteristicas -> delegated to controller.getByProveedor
// This route is defined here for convenience but will be mounted under /api/caracteristica
router.get('/proveedor/:id', controller.getByProveedor);

module.exports = router;