const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedor-completo.controller');
const { authenticateToken, isAdmin, hasRole } = require('../middlewares/auth.middleware');

/**
 * @route   GET /api/proveedores
 * @desc    Obtiene todos los proveedores (con filtros)
 * @access  Public
 * @query   ?estado=aprobado&activo=true&tipo_empresa=musica
 */
router.get('/', proveedorController.getAll);

/**
 * @route   GET /api/proveedores/pendientes
 * @desc    Obtiene proveedores pendientes de aprobación
 * @access  Admin
 */
router.get('/pendientes', authenticateToken, isAdmin, proveedorController.getPendientes);

/**
 * @route   GET /api/proveedores/top
 * @desc    Obtiene proveedores mejor calificados
 * @access  Public
 * @query   ?limit=10
 */
router.get('/top', proveedorController.getTop);

/**
 * @route   GET /api/proveedores/buscar/servicio/:tipo
 * @desc    Busca proveedores por tipo de servicio
 * @access  Public
 */
router.get('/buscar/servicio/:tipo', proveedorController.buscarPorServicio);

/**
 * @route   GET /api/proveedores/:id
 * @desc    Obtiene un proveedor por ID
 * @access  Public
 */
// Ruta compatibilidad: /api/proveedores/:id/completo
router.get('/:id/completo', proveedorController.getById);

router.get('/:id', proveedorController.getById);

/**
 * @route   POST /api/proveedores
 * @desc    Crea un nuevo proveedor (estado: pendiente)
 * @access  Private (requiere autenticación)
 */
router.post('/', authenticateToken, proveedorController.create);

/**
 * @route   PUT /api/proveedores/:id
 * @desc    Actualiza un proveedor
 * @access  Private (requiere autenticación)
 */
router.put('/:id', authenticateToken, proveedorController.update);

/**
 * @route   POST /api/proveedores/:id/aprobar
 * @desc    Aprueba un proveedor
 * @access  Admin
 */
router.post('/:id/aprobar', authenticateToken, isAdmin, proveedorController.aprobar);

/**
 * @route   POST /api/proveedores/:id/rechazar
 * @desc    Rechaza un proveedor
 * @access  Admin
 */
router.post('/:id/rechazar', authenticateToken, isAdmin, proveedorController.rechazar);

/**
 * @route   POST /api/proveedores/:id/suspender
 * @desc    Suspende un proveedor
 * @access  Admin
 */
router.post('/:id/suspender', authenticateToken, isAdmin, proveedorController.suspender);

/**
 * @route   GET /api/proveedores/:id/servicios
 * @desc    Obtiene servicios de un proveedor
 * @access  Public
 */
router.get('/:id/servicios', proveedorController.getServicios);

/**
 * @route   POST /api/proveedores/:id/servicios
 * @desc    Agrega un servicio al proveedor
 * @access  Private (proveedor o admin)
 */
router.post('/:id/servicios', authenticateToken, proveedorController.addServicio);

/**
 * @route   PUT /api/proveedores/servicios/:servicioId
 * @desc    Actualiza un servicio
 * @access  Private (proveedor o admin)
 */
router.put('/servicios/:servicioId', authenticateToken, proveedorController.updateServicio);

/**
 * @route   DELETE /api/proveedores/servicios/:servicioId
 * @desc    Elimina un servicio
 * @access  Private (proveedor o admin)
 */
router.delete('/servicios/:servicioId', authenticateToken, proveedorController.deleteServicio);

module.exports = router;