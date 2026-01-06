/**
 * Configuración de autorización de emails para Resend
 *
 * MODO ACTUAL: Onboarding (solo emails autorizados)
 * MODO FUTURO: Dominio verificado (cualquier email)
 *
 * ============================================================
 * INSTRUCCIONES PARA CAMBIAR A FUTURO (cuando tengas dominio):
 * ============================================================
 * 1. Verifica tu dominio en Resend (ej: eclat.com)
 * 2. Cambia RESEND_MODE en .env a "domain"
 * 3. Cambia RESEND_FROM_DOMAIN en .env a tu dominio (ej: noreply@eclat.com)
 * 4. Listo! Funcionará con cualquier email registrado
 */

const RESEND_MODE = process.env.RESEND_MODE || 'onboarding';
const AUTHORIZED_EMAILS = (process.env.RESEND_AUTHORIZED_EMAILS || '')
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);

/**
 * Verifica si un email está autorizado para recibir emails
 * @param {string} email - Email a verificar
 * @returns {boolean} true si está autorizado
 */
function isEmailAuthorized(email) {
    // Modo dominio verificado: todos los emails autorizados
    if (RESEND_MODE === 'domain') {
        console.log('[email-auth] Modo DOMAIN: email autorizado automáticamente');
        return true;
    }

    // Modo onboarding: solo emails en lista autorizada
    const authorized = AUTHORIZED_EMAILS.includes(email.toLowerCase());

    if (!authorized) {
        console.warn(`[email-auth] Modo ONBOARDING: email ${email} NO está en lista autorizada`);
        console.warn(`[email-auth] Emails autorizados: ${AUTHORIZED_EMAILS.join(', ') || 'NINGUNO'}`);
    }

    return authorized;
}

/**
 * Obtiene el email remitente según el modo
 * @returns {string} Email remitente
 */
function getSenderEmail() {
    if (RESEND_MODE === 'domain') {
        return process.env.RESEND_FROM_DOMAIN || 'noreply@eclat.com';
    }

    return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
}

module.exports = {
    RESEND_MODE,
    AUTHORIZED_EMAILS,
    isEmailAuthorized,
    getSenderEmail
};