const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/postulacion.controller');

// Multer memory storage para Cloudinary uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (aumentado de 10MB)
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, WEBP, PDF'));
    }
});

/**
 * POST /api/postulaciones/proveedores
 * Registra una postulación de proveedor con archivo opcional
 */
router.post('/proveedores', (req, res, next) => {
    upload.single('archivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: 'Error al subir archivo',
                message: err.message
            });
        }
        next();
    });
}, controller.crearProveedor);

/**
 * POST /api/postulaciones/trabajadores
 * Registra una postulación de trabajador con CV opcional
 */
router.post('/trabajadores', (req, res, next) => {
    upload.single('archivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: 'Error al subir archivo',
                message: err.message
            });
        }
        next();
    });
}, controller.crearTrabajador);

module.exports = router;