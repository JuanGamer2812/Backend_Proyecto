const { verifyToken } = require('../utils/jwt.util');

/**
 * Middleware para verificar JWT en las peticiones
 * Agrega el usuario decodificado en req.user
 */
const authenticateToken = (req, res, next) => {
    try {
        // Obtener token de distintas fuentes (header Bearer, x-access-token, query)
        const authHeader = req.headers['authorization'];
        const bearerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        const altHeaderToken = req.headers['x-access-token'];
        const queryToken = req.query && req.query.token;
        const token = bearerToken || altHeaderToken || queryToken;

        console.log('[auth.middleware] Authorization header:', authHeader);
        console.log('[auth.middleware] Token recibido:', token);

        if (!token) {
            return res.status(401).json({
                error: 'Acceso denegado',
                message: 'No se proporcionó token de autenticación'
            });
        }

        // Verificar token
        const decoded = verifyToken(token);
        console.log('[auth.middleware] Usuario decodificado:', decoded);

        // Agregar usuario al request
        req.user = decoded;

        next();
    } catch (error) {
        if (error.message === 'Token expirado') {
            return res.status(401).json({
                error: 'Token expirado',
                message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
            });
        }

        console.error('[auth.middleware] Error al verificar token:', error);
        return res.status(403).json({
            error: 'Token inválido',
            message: error.message
        });
    }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'No autenticado',
            message: 'Debe estar autenticado para acceder a este recurso'
        });
    }

    // Verificar si el usuario tiene id_rol=1 (Administrador)
    if (req.user.id_rol !== 1) {
        return res.status(403).json({
            error: 'Acceso denegado',
            message: 'Requiere permisos de administrador'
        });
    }

    next();
};

/**
 * Middleware para verificar roles específicos
 * @param {Array<string>} roles - Roles permitidos
 */
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'No autenticado',
                message: 'Debe estar autenticado para acceder a este recurso'
            });
        }

        const userRole = req.user.role;
        const userRoleId = req.user.id_rol;
        const userRolNombre = req.user.nombre_rol;
        // Permitir si coincide el id, el nombre de rol (Admin/Administrador), o el string 'admin'
        const allowed = roles.includes(userRole) || roles.includes(userRoleId) ||
            roles.includes(userRolNombre) ||
            (userRoleId === 1 && (roles.includes('Admin') || roles.includes('Administrador')));

        if (!allowed) {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: `Requiere uno de los siguientes roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Middleware opcional de autenticación
 * Si hay token lo valida, pero no rechaza si no hay
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyToken(token);
            req.user = decoded;
        }

        next();
    } catch (error) {
        // Si hay error en el token, continuar sin usuario
        next();
    }
};

module.exports = {
    authenticateToken,
    isAdmin,
    hasRole,
    optionalAuth
};