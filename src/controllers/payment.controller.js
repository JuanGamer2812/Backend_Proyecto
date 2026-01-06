const paymentService = require('../services/payment.service');
const emailService = require('../services/email.service');

/**
 * POST /api/payments/create-intent
 * Crea un PaymentIntent de Stripe
 */
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency, reservaId, eventoNombre } = req.body;

        if (!amount || !reservaId) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Monto y reservaId son requeridos'
            });
        }

        // Convertir a centavos
        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await paymentService.createPaymentIntent(
            amountInCents,
            currency || 'usd',
            {
                reserva_id: reservaId,
                evento_nombre: eventoNombre || '',
                user_id: req.user.userId
            }
        );

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error al crear PaymentIntent:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/payments/confirm
 * Confirma y registra un pago
 */
exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, reservaId, monto } = req.body;

        if (!paymentIntentId || !reservaId || !monto) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'paymentIntentId, reservaId y monto son requeridos'
            });
        }

        // Obtener detalles del PaymentIntent
        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                error: 'Pago no completado',
                message: 'El pago no se ha completado exitosamente'
            });
        }

        // Registrar en base de datos
        const pago = await paymentService.registrarPago(
            reservaId,
            monto,
            'Stripe',
            paymentIntentId
        );

        // Enviar email de confirmación (async)
        if (req.user && req.user.email) {
            emailService.sendPaymentConfirmationEmail(
                req.user.email,
                req.user.nombre,
                pago
            ).catch(err => console.error('Error al enviar email de pago:', err));
        }

        res.json({
            success: true,
            message: 'Pago registrado exitosamente',
            pago
        });
    } catch (error) {
        console.error('Error al confirmar pago:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/payments/webhook
 * Endpoint para webhooks de Stripe
 */
exports.webhook = async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];

        if (!signature) {
            return res.status(400).json({
                error: 'Firma faltante',
                message: 'Stripe-Signature header es requerido'
            });
        }

        // Construir evento desde el payload y firma
        const event = paymentService.construirEventoWebhook(
            req.body, // Raw body (importante: debe ser string, no JSON parseado)
            signature
        );

        // Procesar el evento
        await paymentService.procesarWebhook(event);

        res.json({ received: true });
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(400).json({
            error: 'Webhook inválido',
            message: error.message
        });
    }
};

/**
 * POST /api/payments/cancel/:paymentIntentId
 * Cancela un PaymentIntent
 */
exports.cancelPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const canceledPayment = await paymentService.cancelPaymentIntent(paymentIntentId);

        res.json({
            success: true,
            message: 'Pago cancelado exitosamente',
            payment: canceledPayment
        });
    } catch (error) {
        console.error('Error al cancelar pago:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/payments/refund
 * Crea un reembolso
 */
exports.createRefund = async (req, res) => {
    try {
        const { paymentIntentId, amount } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'paymentIntentId es requerido'
            });
        }

        const amountInCents = amount ? Math.round(amount * 100) : null;

        const refund = await paymentService.createRefund(paymentIntentId, amountInCents);

        res.json({
            success: true,
            message: 'Reembolso procesado exitosamente',
            refund
        });
    } catch (error) {
        console.error('Error al crear reembolso:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/payments/history
 * Obtiene historial de pagos del usuario autenticado
 */
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const pagos = await paymentService.obtenerHistorialPagos(userId);

        res.json({
            success: true,
            pagos
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/payments/:paymentIntentId
 * Obtiene detalles de un pago
 */
exports.getPaymentDetails = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);

        res.json({
            success: true,
            payment: paymentIntent
        });
    } catch (error) {
        console.error('Error al obtener detalles del pago:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

module.exports = {
    createPaymentIntent: exports.createPaymentIntent,
    confirmPayment: exports.confirmPayment,
    webhook: exports.webhook,
    cancelPayment: exports.cancelPayment,
    createRefund: exports.createRefund,
    getPaymentHistory: exports.getPaymentHistory,
    getPaymentDetails: exports.getPaymentDetails
};
