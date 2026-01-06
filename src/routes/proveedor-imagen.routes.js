const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/proveedor-imagen.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// Asegurar que el directorio de uploads existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${timestamp}-${random}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/avif',
            'image/gif'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    }
});

/**
 * Rutas para gestión de imágenes de proveedores
 * Base: /api/proveedor-imagen
 */

// GET - Obtener todas las imágenes de un proveedor
router.get('/proveedor/:id_proveedor', controller.getByProveedor);

// GET - Obtener una imagen específica
router.get('/:id_imagen', controller.getById);

// POST - Subir nuevas imágenes (archivos y/o URLs)
router.post('/', authenticateToken, upload.array('imagenes', 10), controller.create);

// DELETE - Eliminar una imagen
router.delete('/:id_imagen', authenticateToken, controller.delete);

// PUT - Actualizar imagen (url, es_principal, orden)
router.put('/:id_imagen', authenticateToken, controller.update);

// PUT - Establecer imagen como principal
router.put('/:id_imagen/principal', authenticateToken, controller.setPrincipal);

// PUT - Reordenar imágenes de un proveedor
router.put('/proveedor/:id_proveedor/reorder', authenticateToken, controller.reorder);

module.exports = router;