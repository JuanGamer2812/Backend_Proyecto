const passwordResetService = require('../services/password-reset.service');
const emailService = require('../services/email.service');

/**
 * POST /api/password/request-reset
 * Solicita un reset de contraseña
 */
exports.requestReset = async(req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email requerido',
                message: 'El email es obligatorio'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Email inválido',
                message: 'El formato del email no es válido'
            });
        }

        const result = await passwordResetService.requestPasswordReset(email);

        // Si se generó un token, enviar email
        if (result.token) {
            // Enviar email de forma asíncrona (no bloqueante)
            emailService.sendPasswordResetEmail(
                result.userEmail,
                result.userName,
                result.token
            ).catch(err => console.error('Error al enviar email de reset:', err));
        }

        // Siempre retornar el mismo mensaje para prevenir enumeración
        res.json({
            success: true,
            message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación'
        });
    } catch (error) {
        console.error('Error en requestReset:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al procesar la solicitud'
        });
    }
};

/**
 * POST /api/password/validate-token
 * Valida un token de reset
 */
exports.validateToken = async(req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Token requerido',
                message: 'El token es obligatorio'
            });
        }

        const validation = await passwordResetService.validateResetToken(token);

        res.json({
            valid: true,
            email: validation.email,
            message: 'Token válido'
        });
    } catch (error) {
        if (error.message.includes('expirado') || error.message.includes('inválido') || error.message.includes('utilizado')) {
            return res.status(400).json({
                valid: false,
                error: 'Token inválido',
                message: error.message
            });
        }

        console.error('Error en validateToken:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al validar el token'
        });
    }
};

/**
 * POST /api/password/reset
 * Resetea la contraseña con el token
 */
exports.resetPassword = async(req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Token y nueva contraseña son requeridos'
            });
        }

        // Validar longitud de contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Contraseña débil',
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        await passwordResetService.resetPassword(token, newPassword);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        if (error.message.includes('expirado') || error.message.includes('inválido') || error.message.includes('utilizado')) {
            return res.status(400).json({
                error: 'Token inválido',
                message: error.message
            });
        }

        console.error('Error en resetPassword:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al resetear la contraseña'
        });
    }
};

/**
 * POST /api/password/change
 * Cambia la contraseña (usuario autenticado)
 */
exports.changePassword = async(req, res) => {
    try {
        const userId = req.user.id; // Viene del middleware authenticateToken
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Contraseña actual y nueva contraseña son requeridas'
            });
        }

        // Validar longitud de nueva contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Contraseña débil',
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Validar que no sea la misma
        if (currentPassword === newPassword) {
            return res.status(400).json({
                error: 'Contraseña inválida',
                message: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        await passwordResetService.changePassword(userId, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });
    } catch (error) {
        if (error.message === 'Contraseña actual incorrecta') {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: error.message
            });
        }

        console.error('Error en changePassword:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al cambiar la contraseña'
        });
    }
};

module.exports = {
    requestReset: exports.requestReset,
    validateToken: exports.validateToken,
    resetPassword: exports.resetPassword,
    changePassword: exports.changePassword
};