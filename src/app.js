const permisoRoutes = require('./routes/permiso.routes');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

//Llamar a las rutas
const authRoutes = require('./routes/auth.routes');
const emailRoutes = require('./routes/email.routes');
const passwordResetRoutes = require('./routes/password-reset.routes');
const paymentRoutes = require('./routes/payment.routes');
const invitacionRoutes = require('./routes/invitacion.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const categoriaEventoRoutes = require('./routes/categoria-evento.routes');
const proveedorTipoRoutes = require('./routes/proveedor_tipo.routes');
const v_proveedor_caracteristicasRoutes = require('./routes/v_proveedor_caracteristicas.routes');
const planRoutes = require('./routes/plan.routes');
const reservaRoutes = require('./routes/reserva.routes');
const v_usuarioRoutes = require('./routes/v_usuario.routes');
const v_usuario_rolRoutes = require('./routes/v_usuario_rol.routes');
const v_evento_unificadoRoutes = require('./routes/v_evento_unificado.routes');
const v_permisosRoutes = require('./routes/v_permisos.routes');
const v_rol_permisoRoutes = require('./routes/v_rol_permiso.routes');
// Alias para compatibilidad (algunos clientes esperan /api/rol_permiso)
const rolPermisoRoutes = require('./routes/v_rol_permiso.routes');
const v_rolesRoutes = require('./routes/v_roles.routes');
const v_proveedorHomeRoutes = require('./routes/v_proveedor_home.routes');
const v_reseniaRoutes = require('./routes/v_resenia.routes');
const rolRoutes = require('./routes/rol.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const proveedorImagenRoutes = require('./routes/proveedor-imagen.routes');
const proveedorCaracteristicasRoutes = require('./routes/proveedor-caracteristicas.routes');
const proveedorCompletoRoutes = require('./routes/proveedor-completo.routes');
const postulacionRoutes = require('./routes/postulacion.routes');
const trabajaNosotrosProveedorRoutes = require('./routes/trabaja_nosotros_proveedor.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const usuarioRolRoutes = require('./routes/usuario_rol.routes');
const reporteRoutes = require('./routes/reporte.routes');
const filesRoutes = require('./routes/files.routes');
const caracteristicaRoutes = require('./routes/caracteristica.routes');
const eventoRoutes = require('./routes/evento.routes');
const invitadosRoutes = require('./routes/invitados.routes');
const filesController = require('./controllers/files.controller');
const { authenticateToken, isAdmin, optionalAuth } = require('./middlewares/auth.middleware');

const app = express();

// Configuración CORS mejorada - permite múltiples orígenes
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:4200',
            'https://eclat.up.railway.app',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // Permitir requests sin origin (como Postman, curl, mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('[CORS] Origen bloqueado:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Cache preflight por 10 minutos
}));
app.use(express.json());

// Crear directorio de uploads si no existe (en raíz del proyecto)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[uploads] Directorio creado:', uploadsDir);
}

// Crear directorio tmp_uploads si no existe
const tmpUploadsDir = path.join(__dirname, '..', 'tmp_uploads');
if (!fs.existsSync(tmpUploadsDir)) {
    fs.mkdirSync(tmpUploadsDir, { recursive: true });
    console.log('[tmp_uploads] Directorio creado:', tmpUploadsDir);
}

// Serve static uploads - archivos servidos desde raíz del proyecto
app.use('/uploads', express.static(uploadsDir));
app.use('/tmp_uploads', express.static(tmpUploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('[health] GET /health');
    res.status(200).json({ status: 'ok' });
});

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);

// Rutas de email
app.use('/api/email', emailRoutes);

// Rutas de recuperación de contraseña
app.use('/api/password', passwordResetRoutes);

// Rutas de pagos
app.use('/api/payments', paymentRoutes);

// Rutas de notificaciones
// Notificaciones eliminadas: endpoints removidos

// Rutas de invitaciones
app.use('/api/invitaciones', invitacionRoutes);
// Endpoint alternativo para insertar invitados masivos (bulk)
app.use('/api/invitados', invitadosRoutes);

// Rutas de categorías
app.use('/api/categorias', categoriaRoutes);
app.use('/api/categoria-evento', categoriaEventoRoutes);
app.use('/api/proveedor_tipo', proveedorTipoRoutes);
app.use('/api/v_proveedor_caracteristicas', v_proveedor_caracteristicasRoutes);

// Rutas de planes
app.use('/api/planes', planRoutes);

// Rutas de reservas
app.use('/api/reservas', reservaRoutes);

// Rutas de recursos
app.use('/api/v_usuario', v_usuarioRoutes);
app.use('/api/v_usuario_rol', v_usuario_rolRoutes);
app.use('/api/v_evento_unificado', v_evento_unificadoRoutes);
app.use('/api/v_permisos', v_permisosRoutes);
app.use('/api/permiso', permisoRoutes); // POST/PUT/DELETE/GET
app.use('/api/permiso', v_permisosRoutes); // Alias para compatibilidad frontend (GET)
app.use('/api/v_rol_permiso', v_rol_permisoRoutes);
app.use('/api/rol_permiso', rolPermisoRoutes);
// Debug routes (temporal)
app.use('/api/v_roles', v_rolesRoutes);
app.use('/api/v_proveedor_home', v_proveedorHomeRoutes);
app.use('/api/v_resenia', v_reseniaRoutes);
app.use('/api/rol', rolRoutes);
app.use('/api/proveedor', proveedorRoutes);
app.use('/api/proveedor-imagen', proveedorImagenRoutes);
app.use('/api/proveedor-caracteristicas', proveedorCaracteristicasRoutes);
// Rutas completas de proveedores (lista, detalle, servicios, aprobaciones, etc.)
app.use('/api/proveedores', proveedorCompletoRoutes);
// Caracteristicas
app.use('/api/caracteristica', caracteristicaRoutes);
// Endpoints para crear eventos y relaciones
app.use('/api', eventoRoutes);
// Alias para compatibilidad con frontend que espera '/api/tipos-proveedor'
app.use('/api/tipos-proveedor', proveedorTipoRoutes);
app.use('/api/postulaciones', postulacionRoutes);
app.use('/api/trabaja_nosotros_proveedor', trabajaNosotrosProveedorRoutes);
// Alias para frontend que llama /api/trabajanosotros
app.use('/api/trabajanosotros', trabajaNosotrosProveedorRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/usuario_rol', usuarioRolRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/files', filesRoutes);
// Legacy alias for older clients that call /signed-url directly
app.get('/signed-url', optionalAuth, filesController.getSignedUrl);

// Endpoint directo solicitado por frontend
const proveedorController = require('./controllers/proveedor.controller');
app.post('/api/convertir-postulante-a-proveedor', authenticateToken, isAdmin, proveedorController.convertirPostulante);

module.exports = app;
