const crypto = require('crypto');
const db = require('../config/db');

let cachedUserColumns = null;
let lastUserColumnsCheck = 0;

const getUserColumns = async() => {
    const now = Date.now();
    if (cachedUserColumns && (now - lastUserColumnsCheck) < 5 * 60 * 1000) {
        return cachedUserColumns;
    }
    const { rows } = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usuario'
    `);
    cachedUserColumns = new Set(rows.map(r => r.column_name));
    lastUserColumnsCheck = now;
    return cachedUserColumns;
};

/**
 * Construye la lista de columnas opcionales según existan
 */
const buildUserColumnsSelect = async() => {
    const cols = await getUserColumns();
    const optional = [];
    if (cols.has('email_verified')) optional.push('u.email_verified');
    if (cols.has('email_verification_sent_at')) optional.push('u.email_verification_sent_at');
    if (cols.has('verification_token')) optional.push('u.verification_token');
    return optional.join(', ');
};

/**
 * Buscar usuario por email
 */
exports.findByEmail = async(email) => {
    const optionalCols = await buildUserColumnsSelect();
    // Construir lista de columnas sin coma extra
    const baseCols = [
        'u.id_usuario',
        'u.nombre_usuario AS nombre',
        'u.apellido_usuario AS apellido',
        'u.correo_usuario AS email',
        'u.contrasena_usuario AS password',
        'u.telefono_usuario AS telefono',
        'u.foto_perfil_usuario AS foto',
        'u.genero_usuario AS genero',
        "to_char(u.fecha_nacimiento_usuario, 'YYYY-MM-DD') AS fecha_nacimiento",
        'u.fecha_registro_usuario AS fecha_registro',
        'u.estado_usuario AS activo',
        'ur.id_rol',
        'r.nombre_rol AS nombre_rol'
        // 'u.rol AS rol_legacy'
    ];
    if (optionalCols) {
        baseCols.push(...optionalCols.split(', '));
    }
    const selectCols = baseCols.join(',\n            ');
    const result = await db.query(
        `SELECT 
            ${selectCols}
        FROM usuario u
        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ur.id_rol
        WHERE u.correo_usuario = $1
        LIMIT 1`, [email]
    );
    return result.rows[0];
};

/**
 * Buscar usuario por ID
 */
exports.findById = async(id) => {
    const optionalCols = await buildUserColumnsSelect();
    // Construir lista de columnas sin coma extra
    const baseCols = [
        'u.id_usuario',
        'u.nombre_usuario AS nombre',
        'u.apellido_usuario AS apellido',
        'u.correo_usuario AS email',
        'u.contrasena_usuario AS password',
        'u.telefono_usuario AS telefono',
        'u.foto_perfil_usuario AS foto',
        'u.genero_usuario AS genero',
        "to_char(u.fecha_nacimiento_usuario, 'YYYY-MM-DD') AS fecha_nacimiento",
        'u.fecha_registro_usuario AS fecha_registro',
        'u.estado_usuario AS activo',
        'ur.id_rol',
        'r.nombre_rol AS nombre_rol'
        // 'u.rol AS rol_legacy'
    ];
    if (optionalCols) {
        baseCols.push(...optionalCols.split(', '));
    }
    const selectCols = baseCols.join(',\n            ');
    const result = await db.query(
        `SELECT 
            ${selectCols}
        FROM usuario u
        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ur.id_rol
        WHERE u.id_usuario = $1
        LIMIT 1`, [id]
    );
    return result.rows[0];
};

/**
 * Crear nuevo usuario
 */
exports.createUser = async(userData) => {
    const result = await db.query(
        `INSERT INTO usuario (
            nombre_usuario,
            apellido_usuario,
            genero_usuario,
            fecha_nacimiento_usuario,
            contrasena_usuario,
            correo_usuario,
            telefono_usuario,
            foto_perfil_usuario,
            fecha_registro_usuario,
            estado_usuario
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, true)
        RETURNING 
            id_usuario,
            nombre_usuario AS nombre,
            apellido_usuario AS apellido,
            correo_usuario AS email,
            telefono_usuario AS telefono,
            foto_perfil_usuario AS foto,
            genero_usuario AS genero,
            to_char(fecha_nacimiento_usuario, 'YYYY-MM-DD') AS fecha_nacimiento
        ;`, [
            userData.nombre,
            userData.apellido || 'Usuario',
            userData.genero || 'No especificado',
            userData.fecha_nacimiento || '2000-01-01',
            userData.password,
            userData.email,
            userData.telefono,
            userData.foto_perfil_usuario || null
        ]
    );
    return result.rows[0];
};

/**
 * Guardar refresh token en la base de datos
 * Nota: Necesitarás crear una tabla 'refresh_tokens' para esto
 */
exports.saveRefreshToken = async(userId, token) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        // Ensure we don't rely on a unique constraint existing: delete any previous token row for the user
        await client.query('DELETE FROM refresh_tokens WHERE id_usuario = $1', [userId]);
        await client.query(
            `INSERT INTO refresh_tokens (id_usuario, token, fecha_creacion, fecha_expiracion)
             VALUES ($1, $2, NOW(), NOW() + INTERVAL '7 days')`, [userId, token]
        );
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Verificar si un refresh token es válido
 */
exports.verifyRefreshToken = async(userId, token) => {
    const result = await db.query(
        `SELECT * FROM refresh_tokens 
         WHERE id_usuario = $1 AND token = $2 AND fecha_expiracion > NOW()`, [userId, token]
    );
    return result.rows.length > 0;
};

/**
 * Revocar refresh token (logout)
 */
exports.revokeRefreshToken = async(userId) => {
    await db.query('DELETE FROM refresh_tokens WHERE id_usuario = $1', [userId]);
    return true;
};

exports.findRoleIdByName = async(roleName) => {
    if (!roleName) return null;
    const result = await db.query(
        'SELECT id_rol FROM rol WHERE LOWER(nombre_rol) = LOWER($1) LIMIT 1', [roleName]
    );
    return result.rows[0] ? result.rows[0].id_rol : null;
};

/**
 * Actualizar el hash de contraseña del usuario
 */
exports.updatePasswordHash = async(userId, hashedPassword) => {
    const result = await db.query(
        'UPDATE usuario SET contrasena_usuario = $1 WHERE id_usuario = $2 RETURNING id_usuario', [hashedPassword, userId]
    );
    return result.rows[0];
};

exports.assignRole = async(userId, roleId) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM usuario_rol WHERE id_usuario = $1', [userId]);
        await client.query(
            'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2)', [userId, roleId]
        );
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.updateUserProfile = async(userId, fields) => {
    // Build dynamic update
    const sets = [];
    const values = [];
    const pushSet = (column, value) => {
        if (value !== undefined && value !== null) {
            values.push(value);
            sets.push(`${column} = $${values.length}`);
        }
    };

    pushSet('nombre_usuario', fields.nombre);
    pushSet('apellido_usuario', fields.apellido);
    pushSet('correo_usuario', fields.email);
    pushSet('telefono_usuario', fields.telefono);
    pushSet('genero_usuario', fields.genero);
    pushSet('fecha_nacimiento_usuario', fields.fecha_nacimiento);
    pushSet('foto_perfil_usuario', fields.foto_url);

    if (sets.length === 0) return true;

    values.push(userId);
    const sql = `UPDATE usuario SET ${sets.join(', ')} WHERE id_usuario = $${values.length}`;
    await db.query(sql, values);
    return true;
};

exports.findAllWithRoles = async() => {
    const result = await db.query(
        `SELECT 
            u.id_usuario,
            u.nombre_usuario,
            u.apellido_usuario,
            u.correo_usuario,
            u.telefono_usuario,
            u.foto_perfil_usuario,
            u.fecha_registro_usuario,
            u.estado_usuario,
            ur.id_rol,
            r.nombre_rol
        FROM usuario u
        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ur.id_rol
        ORDER BY u.id_usuario ASC`
    );
    return result.rows;
};

// Generar token de verificación
exports.generateVerificationToken = async(userId) => {
    const cols = await getUserColumns();
    if (!cols.has('verification_token')) {
        throw new Error('Columna verification_token no existe en usuario');
    }
    if (!cols.has('email_verified')) {
        throw new Error('Columna email_verified no existe en usuario');
    }
    if (!cols.has('email_verification_sent_at')) {
        throw new Error('Columna email_verification_sent_at no existe en usuario');
    }

    console.log('[generateVerificationToken] userId recibido:', userId);
    const token = crypto.randomBytes(32).toString('hex');
    const updates = [
        'verification_token = $1',
        'email_verified = FALSE',
        'email_verification_sent_at = NOW()'
    ];
    const values = [token, userId];

    const result = await db.query(
        `UPDATE usuario SET ${updates.join(', ')} WHERE id_usuario = $2`,
        values
    );
    console.log('[generateVerificationToken] Token generado:', token);
    console.log('[generateVerificationToken] Filas afectadas por UPDATE:', result.rowCount);

    return token;
};

// Obtener usuario por verification_token
exports.findByVerificationToken = async(token) => {
    const cols = await getUserColumns();
    if (!cols.has('verification_token')) {
        throw new Error('Columna verification_token no existe en usuario');
    }
    const result = await db.query(
        `SELECT * FROM usuario WHERE verification_token = $1 LIMIT 1`, [token]
    );
    return result.rows[0];
};

// Marcar email como verificado
exports.markEmailAsVerified = async(userId) => {
    const cols = await getUserColumns();
    if (!cols.has('email_verified') || !cols.has('verification_token') || !cols.has('email_verification_sent_at')) {
        throw new Error('Faltan columnas para marcar verificación');
    }
    await db.query(
        `UPDATE usuario SET email_verified = TRUE, verification_token = NULL, email_verification_sent_at = NULL WHERE id_usuario = $1`, [userId]
    );
    return true;
};

// Obtener última vez que se envió correo
exports.getVerificationSentAt = async(userId) => {
    const cols = await getUserColumns();
    if (!cols.has('email_verification_sent_at')) {
        return null;
    }
    const { rows } = await db.query(
        `SELECT email_verification_sent_at FROM usuario WHERE id_usuario = $1 LIMIT 1`, [userId]
    );
    return rows[0] ? rows[0].email_verification_sent_at : null;
};

// Marcar fecha/hora de envío
exports.markVerificationSentNow = async(userId) => {
    const cols = await getUserColumns();
    if (!cols.has('email_verification_sent_at')) return true;
    await db.query(
        `UPDATE usuario SET email_verification_sent_at = NOW() WHERE id_usuario = $1`, [userId]
    );
    return true;
};