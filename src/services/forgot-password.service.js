const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const crypto = require('crypto');

/**
 * Genera una contraseña temporal aleatoria segura
 * @returns {string} Contraseña de 12 caracteres (letras, números y símbolos)
 */
const generateTemporaryPassword = () => {
    // ...código V2...
    const length = 12;
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

// ...resto de funciones V2...

const checkResetCooldown = async(userId) => {
    const COOLDOWN_MINUTES = 5;
    try {
        const result = await pool.query(
            'SELECT reset_last_requested_at FROM usuario WHERE id_usuario = $1', [userId]
        );
        if (result.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        const lastRequest = result.rows[0].reset_last_requested_at;
        if (!lastRequest) {
            return { canRequest: true, secondsRemaining: 0 };
        }
        const now = new Date();
        const cooldownEnd = new Date(lastRequest);
        cooldownEnd.setMinutes(cooldownEnd.getMinutes() + COOLDOWN_MINUTES);
        const secondsRemaining = Math.ceil((cooldownEnd - now) / 1000);
        return {
            canRequest: secondsRemaining <= 0,
            secondsRemaining: Math.max(0, secondsRemaining)
        };
    } catch (error) {
        console.error('Error en checkResetCooldown:', error);
        throw error;
    }
};

const generateAndStoreTemporaryPassword = async(email) => {
    // ...código V2 completo...
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userResult = await client.query(
            `SELECT 
                id_usuario, 
                nombre_usuario AS nombre, 
                correo_usuario AS email 
             FROM usuario 
             WHERE correo_usuario = $1`, [email]
        );
        if (userResult.rows.length === 0) {
            console.warn(`Intento de reset para email no registrado: ${email}`);
            return {
                success: true,
                message: 'Si el email existe, recibirás una contraseña temporal',
                emailSent: false
            };
        }
        const user = userResult.rows[0];
        const cooldown = await checkResetCooldown(user.id_usuario);
        if (!cooldown.canRequest) {
            const minutes = Math.floor(cooldown.secondsRemaining / 60);
            const seconds = cooldown.secondsRemaining % 60;
            throw new Error(
                `Debes esperar ${minutes}:${seconds.toString().padStart(2, '0')} antes de solicitar otra contraseña temporal`
            );
        }
        const tempPassword = generateTemporaryPassword();
        const hashedTempPassword = await hashPassword(tempPassword);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await client.query(
            `UPDATE usuario 
             SET temp_password_hash = $1,
                 temp_password_expires_at = $2,
                 must_change_password = false,
                 reset_last_requested_at = NOW()
             WHERE id_usuario = $3`, [hashedTempPassword, expiresAt, user.id_usuario]
        );
        await client.query('COMMIT');
        console.log(`✓ Contraseña temporal generada para usuario ${user.id_usuario} (${user.email})`);
        return {
            success: true,
            emailSent: true,
            userId: user.id_usuario,
            userEmail: user.email,
            userName: user.nombre,
            temporaryPassword: tempPassword, // Solo para enviar por email
            expiresAt: expiresAt.toISOString(),
            message: 'Contraseña temporal generada exitosamente'
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[forgot-password.service] Error en clearTemporaryPassword:', error && error.message ? error.message : error);
        throw error;
    } finally {
        client.release();
    }
};

const validateTemporaryPassword = async(userId, tempPassword) => {
    try {
        console.log(`[forgot-password.service] Validando contraseña temporal para usuario ${userId}`);
        const result = await pool.query(
            `SELECT temp_password_hash, temp_password_expires_at 
             FROM usuario 
             WHERE id_usuario = $1`, [userId]
        );
        if (result.rows.length === 0) {
            console.log('[forgot-password.service] Usuario no encontrado');
            return { valid: false, reason: 'Usuario no encontrado' };
        }
        const user = result.rows[0];
        if (!user.temp_password_hash) {
            console.log('[forgot-password.service] No hay contraseña temporal activa');
            return { valid: false, reason: 'No hay contraseña temporal activa' };
        }
        const now = new Date();
        const expiresAt = new Date(user.temp_password_expires_at);
        console.log('[forgot-password.service] Verificando expiración:', { now, expiresAt, expired: now > expiresAt });
        if (now > expiresAt) {
            console.log('[forgot-password.service] Contraseña temporal expirada');
            return { valid: false, reason: 'Contraseña temporal expirada' };
        }
        console.log('[forgot-password.service] Comparando contraseña con hash...');
        const isValid = await comparePassword(tempPassword, user.temp_password_hash);
        console.log('[forgot-password.service] Resultado de comparación:', isValid);
        if (!isValid) {
            console.log('[forgot-password.service] Contraseña temporal incorrecta');
            return { valid: false, reason: 'Contraseña temporal incorrecta' };
        }
        console.log('[forgot-password.service] ✓ Contraseña temporal válida');
        return { valid: true, mustChangePassword: true };
    } catch (error) {
        console.error('[forgot-password.service] Error en validateTemporaryPassword:', error);
        throw error;
    }
};

const markMustChangePassword = async(userId) => {
    try {
        await pool.query(
            'UPDATE usuario SET must_change_password = true WHERE id_usuario = $1', [userId]
        );
        console.log(`Usuario ${userId} marcado para cambio obligatorio de contraseña`);
    } catch (error) {
        console.error('Error en markMustChangePassword:', error);
        throw error;
    }
};

const clearTemporaryPassword = async(userId, newPassword) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hashedPassword = await hashPassword(newPassword);
        await client.query(
            `UPDATE usuario 
             SET contrasena_usuario = $1,
                 temp_password_hash = NULL,
                 temp_password_expires_at = NULL,
                 must_change_password = false
             WHERE id_usuario = $2`, [hashedPassword, userId]
        );
        await client.query(
            'DELETE FROM refresh_tokens WHERE id_usuario = $1', [userId]
        );
        await client.query('COMMIT');
        console.log(`✓ Contraseña actualizada para usuario ${userId}, datos temporales limpiados`);
        return {
            success: true,
            message: 'Contraseña actualizada exitosamente'
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const checkMustChangePassword = async(userId) => {
    try {
        const result = await pool.query(
            'SELECT must_change_password FROM usuario WHERE id_usuario = $1', [userId]
        );
        if (result.rows.length === 0) {
            return false;
        }
        return result.rows[0].must_change_password === true;
    } catch (error) {
        console.error('Error en checkMustChangePassword:', error);
        return false;
    }
};

module.exports = {
    generateTemporaryPassword,
    checkResetCooldown,
    generateAndStoreTemporaryPassword,
    validateTemporaryPassword,
    markMustChangePassword,
    clearTemporaryPassword,
    checkMustChangePassword
};