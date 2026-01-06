const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const controller = require('../controllers/permiso.controller');
const pool = require('../config/db');
// Eliminar permiso
router.delete('/:id', authenticateToken, isAdmin, controller.deletePermiso);

// Obtener todos los permisos
router.get('/', authenticateToken, async(req, res) => {
    try {
        const result = await pool.query('SELECT id_permiso, nombre_permiso, descripcion_permiso, fecha_registro_permiso FROM permiso ORDER BY id_permiso');
        // Devolver siempre el campo id_permiso real
        res.json(result.rows.map(row => ({
            id_permiso: row.id_permiso,
            nombre_permiso: row.nombre_permiso,
            descripcion_permiso: row.descripcion_permiso,
            fecha_registro_permiso: row.fecha_registro_permiso
        })));
    } catch (err) {
        console.error('Error obteniendo permisos:', err);
        res.status(500).json({ message: 'Error al obtener permisos', error: err.message });
    }
});

// Crear permiso
router.post('/', authenticateToken, isAdmin, async(req, res) => {
    try {
        const { nombre_permiso, descripcion_permiso } = req.body;
        if (!nombre_permiso || typeof nombre_permiso !== 'string') {
            return res.status(400).json({ message: 'nombre_permiso es requerido y debe ser texto' });
        }
        const result = await pool.query(
            'INSERT INTO permiso (nombre_permiso, descripcion_permiso) VALUES ($1, $2) RETURNING *', [nombre_permiso, descripcion_permiso || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando permiso:', err);
        res.status(500).json({ message: 'Error al crear permiso', error: err.message });
    }
});

// Actualizar permiso
router.put('/:id', authenticateToken, isAdmin, async(req, res) => {
    try {
        const { id } = req.params;
        const { nombre_permiso, descripcion_permiso } = req.body;

        if (!nombre_permiso || !descripcion_permiso) {
            return res.status(400).json({ message: 'Nombre y descripción son requeridos' });
        }

        const result = await pool.query(
            `UPDATE permiso
             SET nombre_permiso = $1,
                 descripcion_permiso = $2
             WHERE id_permiso = $3
             RETURNING *`, [nombre_permiso, descripcion_permiso, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Permiso no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando permiso:', err);
        res.status(500).json({ message: 'Error al actualizar el permiso', error: err.message });
    }
});

module.exports = router;