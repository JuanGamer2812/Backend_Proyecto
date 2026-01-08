const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Genera un token único para reset de contraseña
 * @param {number} userId - ID del usuario
 * @returns {string} Token JWT con expiración de 1 hora
 */
const generateResetToken = (userId, email) => {
    const payload = {
        userId,
        email,
        type: 'password_reset',
        nonce: crypto.randomBytes(16).toString('hex') // Previene reutilización
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Verifica si un token de reset es válido
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
const verifyResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'password_reset') {
            throw new Error('Token inválido');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('El token ha expirado');
        }
        throw new Error('Token inválido');
    }
};

/**
 * Solicita un reset de contraseña
 * @param {string} email - Email del usuario
 * @returns {Object} Información del reset
 */
const requestPasswordReset = async(email) => {
    try {
        // Buscar usuario por email
        const result = await pool.query(
            'SELECT id_usuario, nombre, email FROM usuario WHERE email = $1', [email]
        );

        // Siempre retornar éxito para prevenir enumeración de usuarios
        if (result.rows.length === 0) {
            console.warn(`Intento de reset para email no registrado: ${email}`);
            return {
                success: true,
                message: 'Si el email existe, recibirás un enlace de recuperación'
            };
        }

        const user = result.rows[0];
        const resetToken = generateResetToken(user.id_usuario, user.email);

        // Guardar token en base de datos (opcional, para tracking/revocación)
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
             VALUES ($1, $2, NOW() + INTERVAL '1 hour', false)`, [user.id_usuario, resetToken]
        );

        return {
            success: true,
            token: resetToken,
            userId: user.id_usuario,
            userName: user.nombre,
            userEmail: user.email,
            message: 'Token de recuperación generado exitosamente'
        };
    } catch (error) {
        console.error('Error en requestPasswordReset:', error);
        throw error;
    }
};

/**
 * Verifica si un token de reset es válido y no ha sido usado
 * @param {string} token - Token a verificar
 * @returns {Object} Información del token
 */
const validateResetToken = async(token) => {
    try {
        // Verificar firma y expiración del JWT
        const decoded = verifyResetToken(token);

        // Verificar en base de datos si no ha sido usado
        const result = await pool.query(
            `SELECT user_id, used, expires_at
             FROM password_reset_tokens
             WHERE token = $1`, [token]
        );

        if (result.rows.length === 0) {
            throw new Error('Token no encontrado');
        }

        const tokenRecord = result.rows[0];

        if (tokenRecord.used) {
            throw new Error('El token ya ha sido utilizado');
        }

        if (new Date() > new Date(tokenRecord.expires_at)) {
            throw new Error('El token ha expirado');
        }

        return {
            valid: true,
            userId: decoded.userId,
            email: decoded.email
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Resetea la contraseña del usuario
 * @param {string} token - Token de reset
 * @param {string} newPassword - Nueva contraseña
 * @returns {Object} Resultado de la operación
 */
const resetPassword = async(token, newPassword) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Validar token
        const validation = await validateResetToken(token);

        // Hash de la nueva contraseña
        const hashedPassword = await hashPassword(newPassword);

        // Actualizar contraseña del usuario
        await client.query(
            'UPDATE usuario SET contrasena_usuario = $1 WHERE id_usuario = $2', [hashedPassword, validation.userId]
        );

        // Marcar token como usado
        await client.query(
            'UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]
        );

        // Invalidar todos los refresh tokens del usuario (por seguridad)
        await client.query(
            'DELETE FROM refresh_tokens WHERE id_usuario = $1', [validation.userId]
        );

        await client.query('COMMIT');

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

/**
 * Cambia la contraseña de un usuario autenticado
 * @param {number} userId - ID del usuario
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Object} Resultado de la operación
 */
const changePassword = async(userId, currentPassword, newPassword) => {
    try {
        // Obtener contraseña actual
        const result = await pool.query(
            'SELECT contrasena_usuario FROM usuario WHERE id_usuario = $1', [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = result.rows[0];

        // Verificar contraseña actual
        const storedPassword = user.contrasena_usuario || '';
        let isValid = false;
        const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
        if (looksHashed) {
            isValid = await comparePassword(currentPassword, storedPassword);
        } else {
            // Soportar contraseñas en texto plano (legacy)
            isValid = currentPassword === storedPassword;
        }
        if (!isValid) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Hash de la nueva contraseña
        const hashedPassword = await hashPassword(newPassword);

        // Actualizar contraseña
        await pool.query(
            'UPDATE usuario SET contrasena_usuario = $1 WHERE id_usuario = $2', [hashedPassword, userId]
        );

        // Invalidar refresh tokens por seguridad
        await pool.query(
            'DELETE FROM refresh_tokens WHERE id_usuario = $1', [userId]
        );

        return {
            success: true,
            message: 'Contraseña cambiada exitosamente'
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generateResetToken,
    verifyResetToken,
    requestPasswordReset,
    validateResetToken,
    resetPassword,
    changePassword
};
