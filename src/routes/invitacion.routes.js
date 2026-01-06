/**
 * Rutas de Invitaciones
 * Endpoints para gestionar invitados y sistema RSVP
 */

const express = require('express');
const router = express.Router();
const invitacionController = require('../controllers/invitacion.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ============================================
// RUTAS PÚBLICAS (RSVP - Sin autenticación)
// ============================================

/**
 * @route   GET /api/invitaciones/codigo/:codigo
 * @desc    Obtener invitación por código único (RSVP)
 * @access  Público
 */
router.get('/codigo/:codigo', invitacionController.obtenerInvitacionPorCodigo);

/**
 * @route   POST /api/invitaciones/rsvp/:codigo/confirmar
 * @desc    Confirmar asistencia (RSVP)
 * @access  Público
 * @body    acompanantes_confirmados, restricciones_alimentarias
 */
router.post('/rsvp/:codigo/confirmar', invitacionController.confirmarAsistencia);

/**
 * @route   POST /api/invitaciones/rsvp/:codigo/rechazar
 * @desc    Rechazar invitación (RSVP)
 * @access  Público
 */
router.post('/rsvp/:codigo/rechazar', invitacionController.rechazarInvitacion);

// ============================================
// RUTAS PRIVADAS (Requieren autenticación)
// ============================================

// Middleware de autenticación para rutas privadas
router.use(authMiddleware.authenticateToken);

/**
 * @route   POST /api/invitaciones/:eventoId
 * @desc    Crear invitación individual
 * @access  Privado
 * @body    nombre_invitado, email, [telefono, numero_acompanantes, mensaje_personalizado, categoria]
 */
router.post('/:eventoId', invitacionController.crearInvitacion);

/**
 * @route   POST /api/invitaciones/:eventoId/masivo
 * @desc    Crear invitaciones masivas
 * @access  Privado
 * @body    invitados: [{ nombre_invitado, email, ... }]
 */
router.post('/:eventoId/masivo', invitacionController.crearInvitacionesMasivas);

/**
 * @route   POST /api/invitaciones/:invitacionId/enviar
 * @desc    Enviar invitación por email
 * @access  Privado
 */
router.post('/:invitacionId/enviar', invitacionController.enviarInvitacion);

/**
 * @route   POST /api/invitaciones/enviar-masivo
 * @desc    Enviar múltiples invitaciones por email
 * @access  Privado
 * @body    invitacion_ids: [1, 2, 3, ...]
 */
router.post('/enviar-masivo', invitacionController.enviarInvitacionesMasivas);

/**
 * @route   GET /api/invitaciones/evento/:eventoId
 * @desc    Obtener todas las invitaciones de un evento
 * @access  Privado
 */
router.get('/evento/:eventoId', invitacionController.obtenerInvitacionesEvento);

/**
 * @route   GET /api/invitaciones/estadisticas/:eventoId
 * @desc    Obtener estadísticas de invitaciones
 * @access  Privado
 */
router.get('/estadisticas/:eventoId', invitacionController.obtenerEstadisticas);

/**
 * @route   GET /api/invitaciones/categoria/:eventoId
 * @desc    Obtener invitaciones agrupadas por categoría
 * @access  Privado
 */
router.get('/categoria/:eventoId', invitacionController.obtenerPorCategoria);

/**
 * @route   PUT /api/invitaciones/:invitacionId
 * @desc    Actualizar invitación
 * @access  Privado
 * @body    Campos a actualizar (nombre_invitado, email, etc.)
 */
router.put('/:invitacionId', invitacionController.actualizarInvitacion);

/**
 * @route   DELETE /api/invitaciones/:invitacionId
 * @desc    Eliminar invitación
 * @access  Privado
 */
router.delete('/:invitacionId', invitacionController.eliminarInvitacion);

module.exports = router;
