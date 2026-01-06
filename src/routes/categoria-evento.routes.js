const express = require('express');
const router = express.Router();
const CategoriaEventoController = require('../controllers/categoria-evento.controller');

// GET /api/categoria-evento
router.get('/', CategoriaEventoController.getCategoriasEvento);

module.exports = router;