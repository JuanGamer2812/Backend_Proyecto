const express = require('express');
const router = express.Router();
const ReservaController = require('../controllers/reserva.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * Rutas para Reservas - Maneja evento y evento_proveedor
 * Base: /api/reservas
 */

// POST /api/reservas - Crear nueva reserva con evento y proveedores
router.post('/', authenticateToken, ReservaController.crearReserva);

// GET /api/reservas - Obtener todas las reservas (admin)
router.get('/', authenticateToken, ReservaController.getAllReservas);

// GET /api/reservas/usuario/:idUsuario - Obtener reservas de un usuario específico
router.get('/usuario/:idUsuario', authenticateToken, ReservaController.getReservasByUsuario);

// GET /api/reservas/:id - Obtener reserva por ID
router.get('/:id', authenticateToken, ReservaController.getReservaById);

// PATCH /api/reservas/:id/estado - Actualizar estado de reservación
router.patch('/:id/estado', authenticateToken, ReservaController.updateEstadoReserva);

// DELETE /api/reservas/:id - Eliminar reservación
router.delete('/:id', authenticateToken, ReservaController.deleteReserva);

module.exports = router;