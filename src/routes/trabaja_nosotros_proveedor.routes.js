const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/trabaja_nosotros_proveedor.controller');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../tmp_uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF, JPG, PNG, GIF y WEBP'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB
    },
    fileFilter: fileFilter
});

// GET - Obtener todos los registros
router.get('/', controller.getAll);

// GET - Obtener un registro por ID
router.get('/:id', controller.getById);

// POST - Crear un nuevo registro con archivos
router.post('/', upload.array('archivos', 5), controller.create);

// PUT - Actualizar un registro
router.put('/:id', controller.update);

// DELETE - Eliminar un registro
router.delete('/:id', controller.delete);

module.exports = router;