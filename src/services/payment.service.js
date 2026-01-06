let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn('STRIPE_SECRET_KEY no está configurada. Funciones de Stripe estarán deshabilitadas.');
    // Stub que lanza errores explicativos si se usan las funciones de pago sin configurar
    stripe = {
        paymentIntents: {
            create: async () => { throw new Error('Stripe no configurado'); },
            confirm: async () => { throw new Error('Stripe no configurado'); },
            retrieve: async () => { throw new Error('Stripe no configurado'); },
            cancel: async () => { throw new Error('Stripe no configurado'); }
        },
        refunds: { create: async () => { throw new Error('Stripe no configurado'); } }
    };
}
const pool = require('../config/db');

/**
 * Crea un PaymentIntent de Stripe
 * @param {number} amount - Monto en centavos (ej: 5000 = $50.00)
 * @param {string} currency - Moneda (usd, cop, etc.)
 * @param {object} metadata - Datos adicionales
 * @returns {Promise<object>} PaymentIntent creado
 */
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Stripe requiere enteros
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                ...metadata,
                platform: 'ECLAT'
            }
        });

        return paymentIntent;
    } catch (error) {
        console.error('Error al crear PaymentIntent:', error);
        throw new Error(`Error de Stripe: ${error.message}`);
    }
};

/**
 * Confirma un PaymentIntent
 * @param {string} paymentIntentId - ID del PaymentIntent
 * @param {string} paymentMethod - ID del mÃ©todo de pago
 * @returns {Promise<object>} PaymentIntent confirmado
 */
const confirmPaymentIntent = async (paymentIntentId, paymentMethod) => {
    try {
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethod
        });

        return paymentIntent;
    } catch (error) {
        console.error('Error al confirmar pago:', error);
        throw new Error(`Error de Stripe: ${error.message}`);
    }
};

/**
 * Obtiene un PaymentIntent por ID
 * @param {string} paymentIntentId - ID del PaymentIntent
 * @returns {Promise<object>} PaymentIntent
 */
const getPaymentIntent = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        console.error('Error al obtener PaymentIntent:', error);
        throw new Error(`Error de Stripe: ${error.message}`);
    }
};

/**
 * Cancela un PaymentIntent
 * @param {string} paymentIntentId - ID del PaymentIntent
 * @returns {Promise<object>} PaymentIntent cancelado
 */
const cancelPaymentIntent = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        console.error('Error al cancelar pago:', error);
        throw new Error(`Error de Stripe: ${error.message}`);
    }
};

/**
 * Crea un reembolso
 * @param {string} paymentIntentId - ID del pago a reembolsar
 * @param {number} amount - Monto a reembolsar (opcional, null = total)
 * @returns {Promise<object>} Refund creado
 */
const createRefund = async (paymentIntentId, amount = null) => {
    try {
        const refundData = { payment_intent: paymentIntentId };
        
        if (amount !== null) {
            refundData.amount = Math.round(amount);
        }

        const refund = await stripe.refunds.create(refundData);
        return refund;
    } catch (error) {
        console.error('Error al crear reembolso:', error);
        throw new Error(`Error de Stripe: ${error.message}`);
    }
};

/**
 * Registra un pago en la base de datos
 * @param {number} reservaId - ID de la reserva
 * @param {number} monto - Monto del pago
 * @param {string} metodoPago - MÃ©todo de pago
 * @param {string} paymentIntentId - ID del PaymentIntent de Stripe
 * @returns {Promise<object>} Pago registrado
 */
const registrarPago = async (reservaId, monto, metodoPago, paymentIntentId) => {
    try {
        const result = await pool.query(
            `INSERT INTO pago (id_reserva, monto, metodo_pago, estado_pago, fecha_pago, stripe_payment_intent_id)
             VALUES ($1, $2, $3, 'completado', NOW(), $4)
             RETURNING *`,
            [reservaId, monto, metodoPago, paymentIntentId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error al registrar pago:', error);
        throw error;
    }
};

/**
 * Actualiza el estado de un pago
 * @param {string} paymentIntentId - ID del PaymentIntent
 * @param {string} estado - Nuevo estado (completado, fallido, reembolsado)
 * @returns {Promise<object>} Pago actualizado
 */
const actualizarEstadoPago = async (paymentIntentId, estado) => {
    try {
        const result = await pool.query(
            `UPDATE pago 
             SET estado_pago = $1, fecha_actualizacion = NOW()
             WHERE stripe_payment_intent_id = $2
             RETURNING *`,
            [estado, paymentIntentId]
        );

        if (result.rows.length === 0) {
            throw new Error('Pago no encontrado');
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error al actualizar estado de pago:', error);
        throw error;
    }
};

/**
 * Procesa el webhook de Stripe
 * @param {object} event - Evento de Stripe
 * @returns {Promise<boolean>} true si se procesÃ³ correctamente
 */
const procesarWebhook = async (event) => {
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await actualizarEstadoPago(paymentIntent.id, 'completado');
                console.log(`âœ… Pago exitoso: ${paymentIntent.id}`);
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await actualizarEstadoPago(failedPayment.id, 'fallido');
                console.log(`âŒ Pago fallido: ${failedPayment.id}`);
                break;

            case 'charge.refunded':
                const refundedCharge = event.data.object;
                await actualizarEstadoPago(refundedCharge.payment_intent, 'reembolsado');
                console.log(`ðŸ’° Reembolso procesado: ${refundedCharge.payment_intent}`);
                break;

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        return true;
    } catch (error) {
        console.error('Error al procesar webhook:', error);
        throw error;
    }
};

/**
 * Construye evento de webhook desde la firma
 * @param {string} payload - Cuerpo del request
 * @param {string} signature - Firma del webhook
 * @returns {object} Evento verificado
 */
const construirEventoWebhook = (payload, signature) => {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        return event;
    } catch (error) {
        console.error('Error al verificar webhook:', error);
        throw new Error(`Webhook invÃ¡lido: ${error.message}`);
    }
};

/**
 * Obtiene historial de pagos de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Lista de pagos
 */
const obtenerHistorialPagos = async (userId) => {
    try {
        const result = await pool.query(
            `SELECT p.*, r.id_evento, e.nombre_evento
             FROM pago p
             JOIN reserva r ON p.id_reserva = r.id_reserva
             JOIN evento e ON r.id_evento = e.id_evento
             WHERE e.id_usuario = $1
             ORDER BY p.fecha_pago DESC`,
            [userId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error al obtener historial de pagos:', error);
        throw error;
    }
};

module.exports = {
    createPaymentIntent,
    confirmPaymentIntent,
    getPaymentIntent,
    cancelPaymentIntent,
    createRefund,
    registrarPago,
    actualizarEstadoPago,
    procesarWebhook,
    construirEventoWebhook,
    obtenerHistorialPagos
};
