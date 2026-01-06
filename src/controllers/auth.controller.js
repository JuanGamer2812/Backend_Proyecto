const authService = require('../services/auth.service');
const authModel = require('../models/auth.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');
const { idToRolNombre, clientRoleFromId } = require('../utils/roles.util');
const emailService = require('../services/email.service');
const verificationService = require('../services/verification.service');
const cloudinaryConfig = require('../config/cloudinary.config');
const path = require('path');
const fs = require('fs');

/**
 * POST /api/auth/google-login
 * Login/registro con Google OAuth
 * Body: { correo_usuario, nombre_usuario, apellido_usuario, foto_perfil_usuario, genero_usuario, fecha_nacimiento_usuario, telefono_usuario, contrasena_usuario }
 */
exports.googleLogin = async(req, res) => {
    try {
        console.log('[auth.controller] googleLogin - Payload recibido:', req.body);

        const {
            correo_usuario,
            nombre_usuario,
            apellido_usuario,
            foto_perfil_usuario,
            genero_usuario,
            fecha_nacimiento_usuario,
            telefono_usuario,
            contrasena_usuario
        } = req.body;

        // Validar que los campos existan y no estén vacíos
        if (!correo_usuario || !correo_usuario.trim()) {
            return res.status(400).json({
                error: 'Email requerido',
                message: 'El correo electrónico es obligatorio'
            });
        }

        if (!nombre_usuario || !nombre_usuario.trim()) {
            return res.status(400).json({
                error: 'Nombre requerido',
                message: 'El nombre es obligatorio'
            });
        }

        if (!apellido_usuario || !apellido_usuario.trim()) {
            return res.status(400).json({
                error: 'Apellido requerido',
                message: 'El apellido es obligatorio'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo_usuario)) {
            return res.status(400).json({
                error: 'Email inválido',
                message: 'El formato del email no es válido'
            });
        }

        // Buscar usuario por email
        let user = await authModel.findByEmail(correo_usuario);
        let isNew = false;
        const defaultRoleId = (await authModel.findRoleIdByName('Usuario')) || (await authModel.findRoleIdByName('User')) || 2;

        if (!user) {
            // Crear usuario con datos proporcionados por Google OAuth
            const userData = {
                nombre: nombre_usuario,
                apellido: apellido_usuario,
                genero: genero_usuario || 'Otro',
                fecha_nacimiento: fecha_nacimiento_usuario || '2000-01-01',
                password: contrasena_usuario || 'google123',
                email: correo_usuario,
                telefono: telefono_usuario || '0000000000',
                foto_perfil_usuario: foto_perfil_usuario || null
            };
            user = await authModel.createUser(userData);
            // Asignar rol por defecto (rol "Usuario" desde la base)
            if (user && user.id_usuario) {
                await authModel.assignRole(user.id_usuario, defaultRoleId);
                // Leer usuario completo
                user = await authModel.findById(user.id_usuario);
            }
            isNew = true;
        } else {
            // Usuario existente - actualizar foto de perfil si viene de Google y es diferente
            if (foto_perfil_usuario && user.foto !== foto_perfil_usuario) {
                await authModel.updateUserProfile(user.id_usuario, { foto_url: foto_perfil_usuario });
                user.foto = foto_perfil_usuario;
            }
            // Si el usuario no tiene rol asignado, asignar rol por defecto
            if (!user.id_rol) {
                await authModel.assignRole(user.id_usuario, defaultRoleId);
                user = await authModel.findById(user.id_usuario);
            }
        }
        // Generar tokens igual que login normal
        const idRol = user.id_rol || defaultRoleId;
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
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ id: user.id_usuario });
        await authModel.saveRefreshToken(user.id_usuario, refreshToken);
        // Responder igual que login normal
        return res.json({
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                genero: user.genero,
                fecha_nacimiento: user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : null,
                id_rol: idRol,
                role,
                rol_nombre: rolNombre,
                foto: user.foto ? (authService.makeAbsoluteUrl ? authService.makeAbsoluteUrl(user.foto) : user.foto) : null
            },
            accessToken,
            refreshToken,
            nuevo: isNew
        });
    } catch (error) {
        console.error('[auth.controller] googleLogin error:', error && error.message ? error.message : error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message || 'Error en login con Google'
        });
    }
};
/**
 * POST /api/auth/forgot-password
 * Genera y envía contraseña temporal por email (público)
 */

// Helper to truncate/sanitize strings to avoid DB errors

/**
 * POST /api/auth/forgot-password
 * Genera y envía contraseña temporal por email (público)
 */
exports.forgotPassword = async(req, res) => {
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
        const forgotPasswordService = require('../services/forgot-password.service');
        console.log(`[auth.controller] Forgot password request for: ${email}`);
        const result = await forgotPasswordService.generateAndStoreTemporaryPassword(email);
        // Si se generó contraseña temporal, enviar email
        if (result.emailSent && result.temporaryPassword) {
            try {
                await emailService.sendTemporaryPasswordEmail(
                    result.userEmail,
                    result.userName,
                    result.temporaryPassword
                );
                console.log(`[auth.controller] Temporary password email sent to: ${result.userEmail}`);
            } catch (emailError) {
                console.error('[auth.controller] Error sending temporary password email:', emailError);
                // No fallar la request si el email falla, el usuario puede contactar soporte
            }
        }
        // Siempre retornar el mismo mensaje para prevenir enumeración de usuarios
        res.json({
            success: true,
            message: 'Si el email existe en nuestro sistema, recibirás una contraseña temporal'
        });
    } catch (error) {
        console.error('[auth.controller] forgotPassword error:', error);
        // Detectar error de cooldown
        if (error.message && error.message.includes('Debes esperar')) {
            return res.status(429).json({
                error: 'Demasiados intentos',
                message: error.message
            });
        }
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al procesar la solicitud'
        });
    }
};

/**
 * POST /api/auth/change-password-forced (protegido)
 * Cambia la contraseña cuando el usuario tiene must_change_password=true
 */
exports.changePasswordForced = async(req, res) => {
    try {
        // El userId se toma del token JWT
        const userId = req.user && req.user.id;
        const { newPassword } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'userId y newPassword son requeridos'
            });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({
                error: 'Contraseña débil',
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }
        const forgotPasswordService = require('../services/forgot-password.service');
        // Verificar que el usuario debe cambiar su contraseña
        const mustChange = await forgotPasswordService.checkMustChangePassword(userId);
        if (!mustChange) {
            return res.status(400).json({
                error: 'Acción no requerida',
                message: 'No es necesario cambiar tu contraseña'
            });
        }
        // Limpiar contraseña temporal y establecer la nueva
        await forgotPasswordService.clearTemporaryPassword(userId, newPassword);
        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        console.error('[auth.controller] changePasswordForced error:', error && error.message ? error.message : error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'Error al cambiar la contraseña'
        });
    }
};

// Helper to truncate/sanitize strings to avoid DB errors
const safeString = (v, max = 50) => {
    if (v === undefined || v === null) return null;
    return String(v).substring(0, max).trim();
};

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        console.log('[auth.controller] Login attempt for email:', email);

        // Validación básica
        if (!email || !password) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Email y contraseña son requeridos'
            });
        }

        console.log('[auth.controller] Calling authService.login...');
        const result = await authService.login(email, password);
        console.log('[auth.controller] Login successful for:', email);

        res.json(result);
    } catch (error) {
        console.error('[auth.controller] Login error:', error);
        if (error.message === 'Usuario no encontrado' || error.message === 'Contraseña incorrecta') {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }

        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/auth/register
 * Registrar nuevo usuario (acepta multipart/form-data con foto opcional)
 */
exports.register = async(req, res) => {
    try {
        // Soporta tanto application/json (req.body) como multipart/form-data (req.body + req.file via multer)
        const body = req.body || {};

        // Debug: log request summary to help diagnosing multipart/json issues
        console.log('[auth.controller] register - headers:', {
            host: req.headers.host,
            origin: req.headers.origin,
            'content-type': req.headers['content-type']
        });
        console.log('[auth.controller] register - body keys:', Object.keys(body));
        console.log('[auth.controller] register - file present:', !!req.file);

        const nombre = safeString(body.nombre, 50);
        const apellido = safeString(body.apellido, 50);
        const email = safeString(body.email, 255);
        const password = body.password ? String(body.password) : '';
        let telefonoRaw = safeString(body.telefono, 20);
        const telefono = telefonoRaw ? telefonoRaw.replace(/\D/g, '').slice(0, 10) : null;
        const genero = safeString(body.genero, 20);
        const fecha_nacimiento = safeString(body.fecha_nacimiento, 30);
        const id_rol_raw = body.id_rol !== undefined ? Number(body.id_rol) : undefined;

        // Validación básica
        if (!nombre || !email || !password) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Nombre, email y contraseña son requeridos'
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

        // Validar teléfono (exactamente 10 dígitos)
        const telefonoRegex = /^[0-9]{10}$/;
        if (!telefono || !telefonoRegex.test(telefono)) {
            return res.status(400).json({
                error: 'Teléfono inválido',
                message: 'El teléfono debe tener exactamente 10 dígitos numéricos'
            });
        }

        // Normalizar género a valores permitidos
        // Mapear genero M/F/Otros a valores almacenados
        const generoMap = {
            'M': 'Masculino',
            'F': 'Femenino',
            'Otros': 'Otro'
        };
        const generoPermitido = ['Masculino', 'Femenino', 'Otro'];
        const generoNormalizado = generoMap[genero] || (generoPermitido.includes(genero) ? genero : 'Otro');

        // Validar fecha_nacimiento (YYYY-MM-DD)
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (fecha_nacimiento && !fechaRegex.test(fecha_nacimiento)) {
            return res.status(400).json({
                error: 'Fecha inválida',
                message: 'fecha_nacimiento debe estar en formato YYYY-MM-DD'
            });
        }

        // Validar id_rol
        const id_rol = (id_rol_raw && Number.isInteger(id_rol_raw)) ? id_rol_raw : 1;

        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Contraseña débil',
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Si hay archivo, subirlo a Cloudinary (con fallback a local)
        let foto_url = null;
        if (req.file) {
            console.log('[auth.controller] Archivo recibido en registro:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                hasBuffer: !!req.file.buffer
            });

            if (!req.file.buffer) {
                console.error('[auth.controller] req.file.buffer es undefined en registro');
                return res.status(400).json({ 
                    error: 'Error de configuración', 
                    message: 'El archivo no se recibió correctamente en el servidor' 
                });
            }

            try {
                // Intentar subir a Cloudinary
                const result = await cloudinaryConfig.uploadImageBuffer(req.file.buffer, 'eclat/profile-pictures');
                foto_url = result.url;
                console.log('[auth.controller] Imagen subida a Cloudinary:', foto_url);
            } catch (cloudinaryError) {
                console.error('[auth.controller] Error al subir a Cloudinary, usando almacenamiento local:', cloudinaryError);
                // Fallback: guardar localmente
                const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

                const ext = path.extname(req.file.originalname) || '';
                const filename = `${Date.now()}-${req.file.filename || 'upload'}${ext}`;
                const dest = path.join(uploadsDir, filename);
                fs.writeFileSync(dest, req.file.buffer);
                foto_url = `/uploads/${filename}`;
            }
        }

        // Llamar al servicio de autenticación con los campos sanitizados
        const result = await authService.register({ nombre, apellido, email, password, telefono, genero: generoNormalizado, fecha_nacimiento, foto_url, id_rol });

        // Enviar email de bienvenida (no bloqueante)
        emailService.sendWelcomeEmail(email, nombre)
            .catch(err => console.error('Error al enviar email de bienvenida:', err));

        res.status(201).json(result);
    } catch (error) {
        if (error.message === 'El email ya está registrado') {
            return res.status(409).json({
                error: 'Email duplicado',
                message: error.message
            });
        }

        console.error('Error en register:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * PUT /api/auth/profile
 * Actualizar perfil (acepta multipart/form-data o JSON)
 */
exports.updateProfile = async(req, res) => {
    try {
        const userId = req.user.id;
        const body = req.body || {};

        const nombre = safeString(body.nombre, 50);
        const apellido = safeString(body.apellido, 50);
        const email = safeString(body.email, 255);
        let telefonoRaw = safeString(body.telefono, 20);
        const telefono = telefonoRaw ? telefonoRaw.replace(/\D/g, '').slice(0, 10) : null;
        const generoRaw = safeString(body.genero, 20);
        const fecha_nacimiento = safeString(body.fecha_nacimiento, 30);

        // Validaciones
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Email inválido', message: 'Formato de email no válido' });
            }
        }

        if (telefono) {
            const telefonoRegex = /^[0-9]{10}$/;
            if (!telefonoRegex.test(telefono)) {
                return res.status(400).json({ error: 'Teléfono inválido', message: 'El teléfono debe tener exactamente 10 dígitos numéricos' });
            }
        }

        if (fecha_nacimiento) {
            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!fechaRegex.test(fecha_nacimiento)) {
                return res.status(400).json({ error: 'Fecha inválida', message: 'fecha_nacimiento debe estar en formato YYYY-MM-DD' });
            }
        }

        const generoMap = { 'M': 'Masculino', 'F': 'Femenino', 'Otros': 'Otro' };
        const genero = generoMap[generoRaw] || generoRaw;

        // Manejo de foto - subir a Cloudinary (con fallback a local)
        let foto_url = null;
        if (req.file) {
            console.log('[auth.controller] Archivo recibido:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                hasBuffer: !!req.file.buffer
            });

            if (!req.file.buffer) {
                console.error('[auth.controller] req.file.buffer es undefined');
                return res.status(400).json({ 
                    error: 'Error de configuración', 
                    message: 'El archivo no se recibió correctamente en el servidor' 
                });
            }

            try {
                // Intentar subir a Cloudinary
                const result = await cloudinaryConfig.uploadImageBuffer(req.file.buffer, 'eclat/profile-pictures');
                foto_url = result.url;
                console.log('[auth.controller] Imagen de perfil subida a Cloudinary:', foto_url);
            } catch (cloudinaryError) {
                console.error('[auth.controller] Error al subir a Cloudinary, usando almacenamiento local:', cloudinaryError);
                // Fallback: guardar localmente
                const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const ext = path.extname(req.file.originalname) || '';
                const filename = `${Date.now()}-${req.file.filename || 'upload'}${ext}`;
                const dest = path.join(uploadsDir, filename);
                fs.writeFileSync(dest, req.file.buffer);
                foto_url = `/uploads/${filename}`;
            }
        }

        const updated = await authService.updateProfile(userId, { nombre, apellido, email, telefono, genero, fecha_nacimiento, foto_url });
        res.json(updated);
    } catch (error) {
        console.error('[auth.controller] updateProfile error:', error);
        const status = error.code === 'EMAIL_TAKEN' ? 409 : 500;
        res.status(status).json({ error: status === 409 ? 'Email duplicado' : 'Error del servidor', message: error.message });
    }
};

/**
 * POST /api/auth/refresh
 * Renovar token de acceso
 */
exports.refresh = async(req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Token requerido',
                message: 'Refresh token es requerido'
            });
        }

        const result = await authService.refreshToken(refreshToken);

        res.json(result);
    } catch (error) {
        res.status(403).json({
            error: 'Token inválido',
            message: error.message
        });
    }
};

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
exports.me = async(req, res) => {
    try {
        // req.user viene del middleware authenticateToken
        const userId = req.user.id;

        const user = await authService.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                message: 'El usuario no existe'
            });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/auth/logout
 * Cerrar sesión (opcional, puede manejarse solo en frontend)
 */
exports.logout = async(req, res) => {
    try {
        res.json({
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

// POST /api/auth/send-verification (protected)
exports.sendVerificationEmail = async(req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ error: 'No autorizado', message: 'Token inválido' });
        }

        const user = await authService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado', message: 'El usuario no existe' });
        }

        const result = await verificationService.sendVerificationEmail(userId, user.email, user.nombre);
        res.json({ message: 'Correo de verificación enviado', ...result });
    } catch (error) {
        console.error('[auth.controller] sendVerificationEmail error:', error);
        res.status(500).json({ error: 'Error del servidor', message: error.message });
    }
};

// POST /api/auth/verify-email
exports.verifyEmail = async(req, res) => {
    try {
        const token = req.body && req.body.token;
        if (!token) {
            return res.status(400).json({ error: 'Token requerido', message: 'Token de verificación es requerido' });
        }

        const result = await verificationService.verifyEmailToken(token);
        // Buscar usuario actualizado para exponer todos los campos útiles
        const authService = require('../services/auth.service');
        const user = await authService.getUserById(result.userId);

        // Generar nuevos tokens válidos
        const idRol = user.id_rol;
        const payload = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            role: user.role,
            id_rol: idRol,
            nombre_rol: user.rol_nombre || user.nombre_rol
        };
        const accessToken = require('../utils/jwt.util').generateAccessToken(payload);
        const refreshToken = require('../utils/jwt.util').generateRefreshToken({ id: user.id });
        // Guardar refresh token en la base de datos
        await require('../models/auth.model').saveRefreshToken(user.id, refreshToken);

        res.json({
            message: 'Email verificado correctamente',
            user,
            accessToken,
            refreshToken
        });
    } catch (error) {
        const status = error.message && error.message.includes('inválido') ? 400 : 500;
        res.status(status).json({ error: 'Verificación fallida', message: error.message });
    }
};