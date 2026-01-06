const emailService = require('../services/email.service');

/**
 * Envía email de bienvenida
 * POST /api/email/welcome
 */
const sendWelcome = async (req, res) => {
    try {
        const { email, nombre } = req.body;

        if (!email || !nombre) {
            return res.status(400).json({
                success: false,
                error: 'Email y nombre son requeridos'
            });
        }

        const result = await emailService.sendWelcomeEmail(email, nombre);
        
        res.status(200).json({
            success: true,
            message: 'Email de bienvenida enviado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar email de bienvenida:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar email de bienvenida',
            details: error.message
        });
    }
};

/**
 * Envía email de recuperación de contraseña
 * POST /api/email/password-reset
 */
const sendPasswordReset = async (req, res) => {
    try {
        const { email, nombre, resetToken } = req.body;

        if (!email || !nombre || !resetToken) {
            return res.status(400).json({
                success: false,
                error: 'Email, nombre y resetToken son requeridos'
            });
        }

        const result = await emailService.sendPasswordResetEmail(email, nombre, resetToken);
        
        res.status(200).json({
            success: true,
            message: 'Email de recuperación enviado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar email de recuperación',
            details: error.message
        });
    }
};

/**
 * Envía email de confirmación de evento
 * POST /api/email/event-confirmation
 */
const sendEventConfirmation = async (req, res) => {
    try {
        const { email, nombre, eventoData } = req.body;

        if (!email || !nombre || !eventoData) {
            return res.status(400).json({
                success: false,
                error: 'Email, nombre y eventoData son requeridos'
            });
        }

        const result = await emailService.sendEventConfirmationEmail(email, nombre, eventoData);
        
        res.status(200).json({
            success: true,
            message: 'Email de confirmación de evento enviado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar confirmación de evento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar confirmación de evento',
            details: error.message
        });
    }
};

/**
 * Envía invitación a evento
 * POST /api/email/event-invitation
 */
const sendEventInvitation = async (req, res) => {
    try {
        const { invitadoEmail, invitadoNombre, eventoData, codigoInvitacion } = req.body;

        if (!invitadoEmail || !invitadoNombre || !eventoData || !codigoInvitacion) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos: invitadoEmail, invitadoNombre, eventoData, codigoInvitacion'
            });
        }

        const result = await emailService.sendEventInvitationEmail(
            invitadoEmail,
            invitadoNombre,
            eventoData,
            codigoInvitacion
        );
        
        res.status(200).json({
            success: true,
            message: 'Invitación enviada exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar invitación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar invitación',
            details: error.message
        });
    }
};

/**
 * Envía confirmación de pago
 * POST /api/email/payment-confirmation
 */
const sendPaymentConfirmation = async (req, res) => {
    try {
        const { email, nombre, pagoData } = req.body;

        if (!email || !nombre || !pagoData) {
            return res.status(400).json({
                success: false,
                error: 'Email, nombre y pagoData son requeridos'
            });
        }

        const result = await emailService.sendPaymentConfirmationEmail(email, nombre, pagoData);
        
        res.status(200).json({
            success: true,
            message: 'Confirmación de pago enviada exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar confirmación de pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar confirmación de pago',
            details: error.message
        });
    }
};

/**
 * Envía email personalizado
 * POST /api/email/custom
 * Requiere autenticación de admin
 */
const sendCustomEmail = async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;

        if (!to || !subject || (!text && !html)) {
            return res.status(400).json({
                success: false,
                error: 'to, subject y (text o html) son requeridos'
            });
        }

        const result = await emailService.sendEmail({ to, subject, text, html });
        
        res.status(200).json({
            success: true,
            message: 'Email personalizado enviado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al enviar email personalizado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar email personalizado',
            details: error.message
        });
    }
};

/**
 * Envío masivo de invitaciones
 * POST /api/email/bulk-invitations
 */
const sendBulkInvitations = async (req, res) => {
    try {
        const { invitados, eventoData } = req.body;

        if (!invitados || !Array.isArray(invitados) || invitados.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de invitados con al menos un elemento'
            });
        }

        if (!eventoData) {
            return res.status(400).json({
                success: false,
                error: 'eventoData es requerido'
            });
        }

        const results = {
            total: invitados.length,
            sent: 0,
            failed: 0,
            errors: []
        };

        // Enviar invitaciones en paralelo con límite
        const batchSize = 5; // Enviar 5 a la vez para no sobrecargar
        for (let i = 0; i < invitados.length; i += batchSize) {
            const batch = invitados.slice(i, i + batchSize);
            
            const promises = batch.map(async (invitado) => {
                try {
                    await emailService.sendEventInvitationEmail(
                        invitado.email,
                        invitado.nombre,
                        eventoData,
                        invitado.codigo_invitacion
                    );
                    results.sent++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        email: invitado.email,
                        error: error.message
                    });
                }
            });

            await Promise.all(promises);
        }

        res.status(200).json({
            success: true,
            message: `Invitaciones procesadas: ${results.sent} enviadas, ${results.failed} fallidas`,
            data: results
        });
    } catch (error) {
        console.error('Error al enviar invitaciones masivas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar invitaciones masivas',
            details: error.message
        });
    }
};

module.exports = {
    sendWelcome,
    sendPasswordReset,
    sendEventConfirmation,
    sendEventInvitation,
    sendPaymentConfirmation,
    sendCustomEmail,
    sendBulkInvitations
};
