const express = require('express');
const multer = require('multer');
const controller = require('../controllers/proveedor-caracteristicas.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024,
        fieldSize: 50 * 1024 * 1024, // 50MB para campos de texto largos (JSON, descripciones)
        files: 20
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
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    }
});

// POST /api/proveedor-caracteristicas (bulk upsert; supports multipart with files)
router.post('/', authenticateToken, isAdmin, upload.any(), controller.upsertProveedorCaracteristicas);

module.exports = router;
