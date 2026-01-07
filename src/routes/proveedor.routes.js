const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/proveedor.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// Configurar multer para usar memoria (necesario para Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { 
        fileSize: 15 * 1024 * 1024, // 15MB (aumentado para PDFs)
        files: 20 // Máximo 20 archivos por request
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/avif',
            'image/gif',
            'application/pdf'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.error('[MULTER] Tipo de archivo rechazado:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                allowedMimes
            });
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${allowedMimes.join(', ')}`));
        }
    }
});

// GET - Listado público con filtros (estado, categoria)
router.get('/', controller.getListadoPublico);

// GET - Obtener todos los proveedores (requiere autenticación) con filtros: ?verificado=true&estado_aprobacion=pendiente
router.get('/admin', authenticateToken, controller.getAll);

// GET - Obtener proveedores públicos (solo verificados y aprobados para /colaboradores)
router.get('/publico', controller.getPublico);

// GET - Obtener proveedores públicos filtrados por estado/categoría (público)
router.get('/filtrar', controller.getFiltradoPublico);

// GET - Obtener proveedores por categoría (público)
router.get('/categoria/:categoria', controller.getByCategoria);

// 🆕 Obtener proveedor con características aplanadas (público)
router.get('/with-caracteristicas/:id', controller.getByIdWithCaracteristicas);

// GET - Obtener un proveedor por ID (público)
router.get('/:id', controller.getById);

// GET - Obtener caracteristicas de un proveedor
router.get('/:id/caracteristicas', controller.getCaracteristicasByProveedor);

// POST - Convertir postulante a proveedor (admin)
router.post('/convertir-postulante-a-proveedor', authenticateToken, isAdmin, controller.convertirPostulante);

// POST - Crear un nuevo proveedor (multipart/form-data)
// Removemos autenticación ya que el formulario es público
// Usamos .any() para aceptar CUALQUIER campo de archivo dinámicamente
router.post('/',
    upload.any(),
    controller.create
);

// 🆕 Actualizar proveedor CON características (admin)
router.put('/with-caracteristicas/:id', authenticateToken, isAdmin, controller.updateWithCaracteristicas);

// PUT - Actualizar un proveedor (solo admin)
router.put('/:id', authenticateToken, isAdmin, controller.update);

// DELETE - Eliminar un proveedor (solo admin)
router.delete('/:id', authenticateToken, isAdmin, controller.delete);

module.exports = router;