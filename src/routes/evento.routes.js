const express = require('express');
const router = express.Router();
const controller = require('../controllers/evento.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// GET /api/evento - Listar eventos del usuario autenticado
router.get('/evento', authenticateToken, controller.getEventosByUserId);

// GET /api/eventos/plan/:id_plan - Obtener evento de administrador asociado a un plan
router.get('/eventos/plan/:id_plan', controller.getEventoByPlan);

// GET /api/eventos/:id/proveedores - Obtener proveedores de un evento
router.get('/eventos/:id_evento/proveedores', controller.getProveedoresByEvento);

// GET /api/eventos/:id - Obtener evento por ID
router.get('/eventos/:id', controller.getEventoById);

// POST /api/eventos
router.post('/eventos', authenticateToken, controller.createEvento);

// POST /api/evento-proveedores (bulk)
router.post('/evento-proveedores', authenticateToken, controller.createEventoProveedor);

// POST /api/evento-proveedor-caracteristicas (bulk upsert)
router.post('/evento-proveedor-caracteristicas', authenticateToken, controller.createEventoProveedorCaracteristica);

// ==================== RESEÑA ENDPOINTS ====================
// POST /api/resena-evento - Crear una nueva reseña
router.post('/resena-evento', authenticateToken, controller.createResena);

// GET /api/resena-evento/usuario/:id_usuario - Obtener reseñas de un usuario
router.get('/resena-evento/usuario/:id_usuario', authenticateToken, controller.getReseniasByUsuario);

// GET /api/resena-evento/evento/:id_evento - Obtener reseñas de un evento
router.get('/resena-evento/evento/:id_evento', authenticateToken, controller.getReseniasByEvento);

// GET /api/resena-evento/todas - Obtener todas las reseñas de todos los eventos
router.get('/resena-evento/todas', controller.getAllResenia);

module.exports = router;