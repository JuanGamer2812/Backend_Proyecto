const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/email/welcome
 * @desc    Envía email de bienvenida
 * @access  Public (usado por el registro)
 */
router.post('/welcome', emailController.sendWelcome);

/**
 * @route   POST /api/email/password-reset
 * @desc    Envía email de recuperación de contraseña
 * @access  Public (usado por la recuperación)
 */
router.post('/password-reset', emailController.sendPasswordReset);

/**
 * @route   POST /api/email/event-confirmation
 * @desc    Envía confirmación de evento creado
 * @access  Private (requiere autenticación)
 */
router.post('/event-confirmation', authenticateToken, emailController.sendEventConfirmation);

/**
 * @route   POST /api/email/event-invitation
 * @desc    Envía invitación individual a un evento
 * @access  Private (requiere autenticación)
 */
router.post('/event-invitation', authenticateToken, emailController.sendEventInvitation);

/**
 * @route   POST /api/email/bulk-invitations
 * @desc    Envía invitaciones masivas a múltiples invitados
 * @access  Private (requiere autenticación)
 */
router.post('/bulk-invitations', authenticateToken, emailController.sendBulkInvitations);

/**
 * @route   POST /api/email/payment-confirmation
 * @desc    Envía confirmación de pago
 * @access  Private (requiere autenticación)
 */
router.post('/payment-confirmation', authenticateToken, emailController.sendPaymentConfirmation);

/**
 * @route   POST /api/email/custom
 * @desc    Envía email personalizado
 * @access  Admin (solo administradores)
 */
router.post('/custom', authenticateToken, isAdmin, emailController.sendCustomEmail);

module.exports = router;
