const express = require('express');
const router = express.Router();
const controller = require('../controllers/rol.controller');


const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');


// Obtener todos los roles
router.get('/', controller.getAll);

// Crear un nuevo rol
router.post('/', authenticateToken, isAdmin, controller.createRol);


// Eliminar un rol existente
router.delete('/:id', authenticateToken, isAdmin, controller.deleteRol);

// Actualizar un rol existente
router.put('/:id', authenticateToken, isAdmin, controller.updateRol);

module.exports = router;