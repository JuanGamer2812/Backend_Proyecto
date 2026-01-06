const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/payments/create-intent
 * @desc    Crea un PaymentIntent de Stripe
 * @access  Private (requiere autenticación)
 */
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent);

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirma y registra un pago exitoso
 * @access  Private (requiere autenticación)
 */
router.post('/confirm', authenticateToken, paymentController.confirmPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Webhook de Stripe para eventos de pago
 * @access  Public (verificado por firma de Stripe)
 * @note    Este endpoint debe recibir el raw body, no JSON parseado
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

/**
 * @route   POST /api/payments/cancel/:paymentIntentId
 * @desc    Cancela un PaymentIntent
 * @access  Private (requiere autenticación)
 */
router.post('/cancel/:paymentIntentId', authenticateToken, paymentController.cancelPayment);

/**
 * @route   POST /api/payments/refund
 * @desc    Crea un reembolso
 * @access  Admin (solo administradores)
 */
router.post('/refund', authenticateToken, isAdmin, paymentController.createRefund);

/**
 * @route   GET /api/payments/history
 * @desc    Obtiene historial de pagos del usuario
 * @access  Private (requiere autenticación)
 */
router.get('/history', authenticateToken, paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/:paymentIntentId
 * @desc    Obtiene detalles de un pago específico
 * @access  Private (requiere autenticación)
 */
router.get('/:paymentIntentId', authenticateToken, paymentController.getPaymentDetails);

module.exports = router;
