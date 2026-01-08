const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

// Multer memory storage for Cloudinary uploads with image filter
const upload = multer({
    storage: multer.memoryStorage(), // Almacenar en memoria como buffer
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
        fieldSize: 50 * 1024 * 1024 // 50MB para campos de texto largos
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Tipo de archivo no permitido. Solo jpg/png/webp/avif'));
    }
});

// Rutas pÃºblicas
router.post('/login', controller.login);
// Google login endpoint
router.post('/google-login', controller.googleLogin);
// Register with multer error handling
router.post('/register', (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'Archivo inválido', message: err.message });
        }
        next();
    });
}, controller.register);
// Actualizar perfil
// Profile update with multer error handling
router.put('/profile', authenticateToken, (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'Archivo inválido', message: err.message });
        }
        next();
    });
}, controller.updateProfile);
router.post('/refresh', controller.refresh);
router.post('/send-verification', authenticateToken, controller.sendVerificationEmail);
router.post('/verify-email', controller.verifyEmail);
// Recuperación de contraseña (público)
router.post('/forgot-password', controller.forgotPassword);

// Rutas protegidas

// Rutas protegidas
router.get('/me', authenticateToken, controller.me);
router.post('/logout', authenticateToken, controller.logout);
// Cambio de contraseña forzado después de usar contraseña temporal (requiere autenticación)
router.post('/change-password-forced', authenticateToken, controller.changePasswordForced);

module.exports = router;