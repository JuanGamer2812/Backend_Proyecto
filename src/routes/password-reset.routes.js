const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/password-reset.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/password/request-reset
 * @desc    Solicita un reset de contraseña (envía email)
 * @access  Public
 */
router.post('/request-reset', passwordResetController.requestReset);

/**
 * @route   POST /api/password/validate-token
 * @desc    Valida un token de reset
 * @access  Public
 */
router.post('/validate-token', passwordResetController.validateToken);

/**
 * @route   POST /api/password/reset
 * @desc    Resetea la contraseña con el token
 * @access  Public
 */
router.post('/reset', passwordResetController.resetPassword);

/**
 * @route   POST /api/password/change
 * @desc    Cambia la contraseña (usuario autenticado)
 * @access  Private (requiere autenticación)
 */
router.post('/change', authenticateToken, passwordResetController.changePassword);

module.exports = router;
