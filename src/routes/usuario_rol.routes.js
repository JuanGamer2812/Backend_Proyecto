const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario_rol.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// Asignar o actualizar rol de un usuario
router.post('/', authenticateToken, isAdmin, controller.assign);

module.exports = router;