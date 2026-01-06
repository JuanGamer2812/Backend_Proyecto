const authModel = require('../models/auth.model');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.util');
const { roleStringToId, idToRolNombre, clientRoleFromId } = require('../utils/roles.util');
const { makeAbsoluteUrl } = require('../utils/url.util');
const mapGeneroToCode = (g) => {
    if (!g) return null;
    const s = String(g).toLowerCase();
    if (s === 'masculino' || s === 'm') return 'M';
    if (s === 'femenino' || s === 'f') return 'F';
    return 'Otros';
};

/**
 * Iniciar sesión de usuario
 */
exports.login = async(email, password) => {
    // Buscar usuario por email
    const user = await authModel.findByEmail(email);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    let isTemporaryPasswordUsed = false;
    let mustChangePassword = false;

    // Verificar contraseña normal
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
        // Fallback 1: si la contraseña almacenada no es un hash bcrypt, permitir login comparando texto plano
        const looksHashed = typeof user.password === 'string' && user.password.startsWith('$2');
        if (!looksHashed && password === user.password) {
            // Login exitoso con contraseña en texto plano (migración pendiente)
        } else {
            // Fallback 2: verificar si es contraseña temporal
            const forgotPasswordService = require('./forgot-password.service');
            const tempValidation = await forgotPasswordService.validateTemporaryPassword(user.id_usuario, password);
            if (!tempValidation.valid) {
                throw new Error('Contraseña incorrecta');
            }
            // Login exitoso con contraseña temporal
            isTemporaryPasswordUsed = true;
            mustChangePassword = tempValidation.mustChangePassword;
            // Marcar que el usuario debe cambiar su contraseña
            await forgotPasswordService.markMustChangePassword(user.id_usuario);
            console.log(`[auth.service] User ${user.id_usuario} logged in with temporary password`);
        }
    }

    // Generar tokens
    const idRol = user.id_rol || roleStringToId(user.nombre_rol) || roleStringToId(user.rol_legacy) || 1;
    const rolNombre = idToRolNombre(idRol, user.nombre_rol);
    const role = clientRoleFromId(idRol);

    const payload = {
        id: user.id_usuario,
        email: user.email,
        nombre: user.nombre,
        role,
        id_rol: idRol
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user.id_usuario });

    // Guardar refresh token en la base de datos
    await authModel.saveRefreshToken(user.id_usuario, refreshToken);

    return {
        message: 'Login exitoso',
        user: {
            id: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            telefono: user.telefono,
            genero: mapGeneroToCode(user.genero),
            fecha_nacimiento: user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : null,
            id_rol: idRol,
            role,
            rol_nombre: rolNombre,
            foto: user.foto ? makeAbsoluteUrl(user.foto) : null,
            email_verified: user.email_verified || false,
            must_change_password: mustChangePassword || user.must_change_password || false
        },
        accessToken,
        refreshToken,
        temporary_password_used: isTemporaryPasswordUsed
    };
};

/**
 * Registrar nuevo usuario
 */
exports.register = async(userData) => {
    // Sanitizar/truncar datos para evitar errores de longitud en la BD
    const safeString = (v, max = 50) => {
        if (v === undefined || v === null) return null;
        return String(v).substring(0, max).trim();
    };

    const nombre = safeString(userData.nombre, 50);
    const apellido = safeString(userData.apellido, 50) || 'Usuario';
    const email = safeString(userData.email, 255);
    const telefono = safeString(userData.telefono, 12);
    const generoRaw = safeString(userData.genero, 20);
    const fecha_nacimiento = safeString(userData.fecha_nacimiento, 30) || '2000-01-01';
    const foto_url = userData.foto_url || null;
    // Forzar que nuevos registros siempre reciban rol 'Usuario' (id_rol = 2)
    // Ignorar cualquier valor enviado por el cliente para id_rol por seguridad
    const idRolSolicitado = 2;

    // Normalizar género a valores admitidos por la BD
    const generoPermitido = ['Masculino', 'Femenino', 'Otro'];
    const genero = generoPermitido.includes(generoRaw) ? generoRaw : 'Otro';

    // Validar teléfono (requerido, 1-12 dígitos)
    const telefonoRegex = /^[0-9]{1,12}$/;
    if (!telefono || !telefonoRegex.test(telefono)) {
        throw new Error('Teléfono inválido: se requieren 1-12 dígitos');
    }

    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        throw new Error('Email inválido');
    }

    try {
        // Verificar si el email ya existe
        const existingUser = await authModel.findByEmail(email);
        if (existingUser) {
            throw new Error('El email ya está registrado');
        }

        // Encriptar contraseña (hasta 255 chars en columna en BD)
        const hashedPassword = await hashPassword(userData.password);

        // Crear usuario con campos sanitizados
        const newUser = await authModel.createUser({
            nombre,
            apellido,
            genero,
            fecha_nacimiento,
            password: hashedPassword,
            email,
            telefono: telefono || null,
            foto_perfil_usuario: foto_url,
            rol: 'user'
        });

        // Asignar rol 'Usuario' (id_rol = 2) siempre al registrarse
        await authModel.assignRole(newUser.id_usuario, idRolSolicitado);

        // Leer usuario con rol ya asignado para devolver info completa
        const fullUser = await authModel.findById(newUser.id_usuario);
        const idRol = fullUser.id_rol || idRolSolicitado;
        const rolNombre = idToRolNombre(idRol, fullUser.nombre_rol);
        const role = clientRoleFromId(idRol);

        // Generar tokens
        const payload = {
            id: fullUser.id_usuario,
            email: fullUser.email,
            nombre: fullUser.nombre,
            role,
            id_rol: idRol,
            nombre_rol: rolNombre
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ id: fullUser.id_usuario });

        // Guardar refresh token
        await authModel.saveRefreshToken(fullUser.id_usuario, refreshToken);

        return {
            message: 'Usuario registrado exitosamente',
            user: {
                id: fullUser.id_usuario,
                nombre: fullUser.nombre,
                apellido: fullUser.apellido,
                email: fullUser.email,
                telefono: fullUser.telefono,
                genero: mapGeneroToCode(fullUser.genero || genero),
                fecha_nacimiento: (fullUser.fecha_nacimiento || fecha_nacimiento) ? String(fullUser.fecha_nacimiento || fecha_nacimiento).substring(0, 10) : null,
                id_rol: idRol,
                role,
                rol_nombre: rolNombre,
                foto: (fullUser.foto || foto_url) ? makeAbsoluteUrl(fullUser.foto || foto_url) : null
            },
            accessToken,
            refreshToken
        };
    } catch (error) {
        console.error('DB error in auth.register:', error && error.message ? error.message : error);
        throw new Error('Database error: ' + (error && error.message ? error.message : ''));
    }
};

/**
 * Renovar token de acceso usando refresh token
 */
exports.refreshToken = async(refreshToken) => {
    try {
        // Verificar refresh token
        const decoded = verifyToken(refreshToken);

        // Verificar que el refresh token existe en la BD
        const isValid = await authModel.verifyRefreshToken(decoded.id, refreshToken);

        if (!isValid) {
            throw new Error('Refresh token inválido o revocado');
        }

        // Obtener usuario actualizado
        const user = await authModel.findById(decoded.id);

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Generar nuevo access token
        const idRol = user.id_rol || roleStringToId(user.nombre_rol) || roleStringToId(user.rol_legacy) || 1;
        const rolNombre = idToRolNombre(idRol, user.nombre_rol);
        const role = clientRoleFromId(idRol);

        const payload = {
            id: user.id_usuario,
            email: user.email,
            nombre: user.nombre,
            role,
            id_rol: idRol,
            nombre_rol: rolNombre
        };

        const newAccessToken = generateAccessToken(payload);

        return {
            accessToken: newAccessToken
        };
    } catch (error) {
        throw new Error('Refresh token inválido: ' + error.message);
    }
};

/**
 * Obtener usuario por ID
 */
exports.getUserById = async(userId) => {
    const user = await authModel.findById(userId);
    if (!user) {
        // Siempre devolver todos los campos aunque el usuario no exista
        return {
            id: null,
            nombre: null,
            apellido: null,
            email: null,
            telefono: null,
            genero: null,
            fecha_nacimiento: null,
            id_rol: null,
            role: null,
            rol_nombre: null,
            foto: null,
            fecha_registro: null,
            email_verified: false,
            verification_token: null,
            email_verification_sent_at: null
        };
    }
    const idRol = user.id_rol || roleStringToId(user.nombre_rol) || roleStringToId(user.rol_legacy) || 1;
    const rolNombre = idToRolNombre(idRol, user.nombre_rol);
    const role = clientRoleFromId(idRol);
    return {
        id: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        genero: mapGeneroToCode(user.genero),
        fecha_nacimiento: user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : null,
        id_rol: idRol,
        role,
        rol_nombre: rolNombre,
        foto: user.foto ? makeAbsoluteUrl(user.foto) : null,
        fecha_registro: user.fecha_registro,
        email_verified: user.email_verified || false,
        verification_token: user.verification_token ? user.verification_token : null,
        email_verification_sent_at: user.email_verification_sent_at ? user.email_verification_sent_at : null
    };
};

// Actualizar perfil de usuario (fuera de register)
exports.updateProfile = async(userId, fields) => {
    // Validar unicidad de email si cambia
    if (fields.email) {
        const existing = await authModel.findByEmail(fields.email);
        if (existing && existing.id_usuario !== userId) {
            const err = new Error('El email ya está registrado por otro usuario');
            err.code = 'EMAIL_TAKEN';
            throw err;
        }
    }

    await authModel.updateUserProfile(userId, fields);
    const fullUser = await authModel.findById(userId);
    if (!fullUser) throw new Error('Usuario no encontrado');

    const idRol = fullUser.id_rol || roleStringToId(fullUser.nombre_rol) || roleStringToId(fullUser.rol_legacy) || 1;
    const rolNombre = idToRolNombre(idRol, fullUser.nombre_rol);
    const role = clientRoleFromId(idRol);

    return {
        message: 'Perfil actualizado',
        user: {
            id: fullUser.id_usuario,
            nombre: fullUser.nombre,
            apellido: fullUser.apellido,
            email: fullUser.email,
            telefono: fullUser.telefono,
            genero: mapGeneroToCode(fullUser.genero),
            fecha_nacimiento: fullUser.fecha_nacimiento ? String(fullUser.fecha_nacimiento).substring(0, 10) : null,
            id_rol: idRol,
            role,
            rol_nombre: rolNombre,
            foto: fullUser.foto ? makeAbsoluteUrl(fullUser.foto) : null,
            email_verified: fullUser.email_verificado || null,
            verification_sent_at: fullUser.verification_sent_at || null
        }
    };
};