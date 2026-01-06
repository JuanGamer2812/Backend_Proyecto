const express = require('express');
const router = express.Router();
const controller = require('../controllers/reporte.controller');

router.get('/proveedores', controller.getProveedores);
router.get('/trabajadores', controller.getTrabajadores);
router.get('/proveedores/pdf', controller.getProveedoresPdf);
router.get('/trabajadores/pdf', controller.getTrabajadoresPdf);

module.exports = router;