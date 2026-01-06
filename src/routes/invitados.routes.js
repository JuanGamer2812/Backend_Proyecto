const express = require('express');
const router = express.Router();
const invitacionController = require('../controllers/invitacion.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// POST /api/invitados  -> body: { eventoId, invitados: [ ... ] }
router.post('/', authenticateToken, async(req, res) => {
    try {
        const { eventoId, invitados } = req.body;
        if (!eventoId) return res.status(400).json({ success: false, message: 'eventoId es requerido' });
        if (!Array.isArray(invitados) || invitados.length === 0) return res.status(400).json({ success: false, message: 'Array de invitados requerido' });
        // Reutilizamos el servicio existente vía controlador
        const resultados = await invitacionController.crearInvitacionesMasivas({ params: { eventoId }, body: { invitados } }, res);
        // Nota: la función del controlador ya responde al cliente, no retornamos aquí.
    } catch (error) {
        console.error('Error en /api/invitados:', error);
        res.status(500).json({ success: false, message: 'Error al crear invitados masivos', error: error.message });
    }
});

module.exports = router;