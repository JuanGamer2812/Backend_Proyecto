const authModel = require('../models/auth.model');
const emailService = require('./email.service');

// Envía email de verificación usando Resend
exports.sendVerificationEmail = async(userId, userEmail, userName) => {
    if (!userId || !userEmail) {
        throw new Error('Faltan datos de usuario para verificación');
    }

    const token = await authModel.generateVerificationToken(userId);
    await authModel.markVerificationSentNow(userId);

    await emailService.sendVerificationEmailWithResend(userEmail, userName || 'Usuario', token);
    // Leer el campo actualizado
    const email_verification_sent_at = await authModel.getVerificationSentAt(userId);
    return { sentTo: userEmail, token, email_verification_sent_at };
};

// Verifica el token y marca el email como confirmado
exports.verifyEmailToken = async(token) => {
    if (!token) {
        throw new Error('Token de verificación faltante');
    }

    const user = await authModel.findByVerificationToken(token);
    if (!user) {
        throw new Error('Token de verificación inválido o expirado');
    }

    // Registrar fecha de verificación
    const now = new Date();
    await authModel.markEmailAsVerified(user.id_usuario || user.id);
    // Opcional: guardar email_verified_at si existe la columna
    if (authModel.setEmailVerifiedAt) {
        await authModel.setEmailVerifiedAt(user.id_usuario || user.id, now);
    }
    return {
        userId: user.id_usuario || user.id,
        email: user.correo_usuario || user.email,
        email_verified: true,
        email_verification_sent_at: null,
        email_verified_at: now.toISOString()
    };
};