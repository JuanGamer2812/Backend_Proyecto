const express = require('express');
const router = express.Router();
const controller = require('../controllers/proveedor_tipo.controller');

// GET /api/proveedor_tipo
router.get('/', controller.getAll);

module.exports = router;