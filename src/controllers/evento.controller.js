const Service = require('../services/evento.service');
const pool = require('../config/db');

exports.getEventosByUserId = async(req, res) => {
    try {
        const userId = req.user.id;
        const eventos = await Service.getEventosByUserId(userId);
        return res.status(200).json(eventos);
    } catch (err) {
        console.error('Error en evento.controller.getEventosByUserId:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getEventoByPlan = async(req, res) => {
    try {
        const { id_plan } = req.params;
        const evento = await Service.getEventoByPlan(id_plan);
        if (!evento) {
            return res.status(404).json({ error: 'No hay evento de administrador para este plan' });
        }
        return res.status(200).json(evento);
    } catch (err) {
        console.error('Error en evento.controller.getEventoByPlan:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getEventoById = async(req, res) => {
    try {
        const { id } = req.params;
        const evento = await Service.getEventoById(id);
        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }
        return res.status(200).json(evento);
    } catch (err) {
        console.error('Error en evento.controller.getEventoById:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getProveedoresByEvento = async(req, res) => {
    try {
        const { id_evento } = req.params;
        const proveedores = await Service.getProveedoresByEvento(id_evento);
        return res.status(200).json(proveedores);
    } catch (err) {
        console.error('Error en evento.controller.getProveedoresByEvento:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.createEvento = async(req, res) => {
    try {
        const payload = req.body || {};
        // Validaciones básicas de fechas
        if (payload.fecha_inicio_evento && payload.fecha_fin_evento) {
            const inicio = new Date(payload.fecha_inicio_evento);
            const fin = new Date(payload.fecha_fin_evento);
            if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
                return res.status(400).json({ error: 'Fechas inválidas' });
            }
            if (fin <= inicio) {
                return res.status(400).json({ error: 'fecha_fin_evento debe ser posterior a fecha_inicio_evento' });
            }
        }
        const created = await Service.createEvento(payload);
        return res.status(201).json({ id_evento: created.id_evento });
    } catch (err) {
        console.error('Error en evento.controller.createEvento:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.createEventoProveedor = async(req, res) => {
    try {
        const items = req.body || [];
        const inserted = await Service.createEventoProveedorBulk(items);
        return res.status(201).json(inserted);
    } catch (err) {
        console.error('Error en evento.controller.createEventoProveedor:', err);
        if (err && err.code === 'OVERLAP') {
            return res.status(409).json({ error: 'conflict', detail: err.message, conflict: err.conflict || null });
        }
        return res.status(500).json({ error: err.message });
    }
};

exports.createEventoProveedorCaracteristica = async(req, res) => {
    try {
        const items = req.body || [];
        const inserted = await Service.createEventoProveedorCaracteristicaBulk(items);
        return res.status(201).json(inserted);
    } catch (err) {
        console.error('Error en evento.controller.createEventoProveedorCaracteristica:', err);
        return res.status(500).json({ error: err.message });
    }
};

// ==================== ENDPOINT 8: POST /api/resena-evento ====================
/**
 * Crear una nueva reseña para un evento
 * Body: { id_evento, id_usuario, calificacion, comentario }
 * Respuesta: { message, resena }
 */
exports.createResena = async(req, res) => {
    const { id_evento, id_usuario, calificacion, comentario } = req.body;

    try {
        // 1. VALIDACIÓN: Calificación debe estar entre 1 y 5
        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({
                message: 'La calificación debe estar entre 1 y 5'
            });
        }

        // 2. VALIDACIÓN: El evento debe existir, pertenecer al usuario y haber finalizado
        const eventoQuery = await pool.query(
            `SELECT * FROM evento 
       WHERE id_evento = $1 
       AND id_usuario_creador = $2 
       AND fecha_fin_evento < NOW()`, [id_evento, id_usuario]
        );

        if (eventoQuery.rows.length === 0) {
            return res.status(400).json({
                message: 'No puedes reseñar este evento (no existe, no es tuyo o aún no ha finalizado)'
            });
        }

        // 3. VALIDACIÓN: No permitir reseñas duplicadas
        const reseniaExistente = await pool.query(
            'SELECT * FROM resena_evento WHERE id_evento = $1 AND id_usuario = $2', [id_evento, id_usuario]
        );

        if (reseniaExistente.rows.length > 0) {
            return res.status(400).json({
                message: 'Ya has reseñado este evento'
            });
        }

        // 4. INSERTAR reseña en la base de datos
        const insertQuery = await pool.query(
            `INSERT INTO resena_evento (id_evento, id_usuario, calificacion, comentario) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`, [id_evento, id_usuario, calificacion, comentario || null]
        );

        // 5. RESPUESTA exitosa
        console.log(`✅ Reseña creada para evento ${id_evento} por usuario ${id_usuario}`);
        res.json({
            message: 'Reseña creada correctamente',
            resena: insertQuery.rows[0]
        });

    } catch (err) {
        console.error('❌ Error al crear reseña:', err);
        res.status(500).json({ message: 'Error al crear reseña' });
    }
};

// ==================== ENDPOINT 9: GET /api/resena-evento/usuario/:id_usuario ====================
/**
 * Obtener todas las reseñas de un usuario
 * Params: id_usuario (INTEGER)
 * Respuesta: Array de reseñas con información del evento
 */
exports.getReseniasByUsuario = async(req, res) => {
    const { id_usuario } = req.params;

    try {
        const result = await pool.query(
            `SELECT r.*, e.nombre_evento 
       FROM resena_evento r
       INNER JOIN evento e ON r.id_evento = e.id_evento
       WHERE r.id_usuario = $1
       ORDER BY r.fecha_creacion DESC`, [id_usuario]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener reseñas:', err);
        res.status(500).json({ message: 'Error al obtener reseñas' });
    }
};

// ==================== ENDPOINT 10: GET /api/resena-evento/evento/:id_evento ====================
/**
 * Obtener todas las reseñas de un evento (para catálogo)
 * Params: id_evento (INTEGER)
 * Respuesta: Array de reseñas con información del usuario
 */
exports.getReseniasByEvento = async(req, res) => {
    const { id_evento } = req.params;

    try {
        const result = await pool.query(
            `SELECT r.*, u.nombre_usuario, u.apellido_usuario, u.foto_perfil_usuario
       FROM resena_evento r
       LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.id_evento = $1
       ORDER BY r.fecha_creacion DESC`, [id_evento]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener reseñas del evento:', err);
        res.status(500).json({ message: 'Error al obtener reseñas' });
    }
};

// ==================== ENDPOINT 11: GET /api/resena-evento/todas ====================
/**
 * Obtener todas las reseñas de todos los eventos (para catálogo)
 * Respuesta: Array de reseñas con información del usuario y evento
 */
exports.getAllResenia = async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, 
                    u.nombre_usuario, 
                    u.apellido_usuario, 
                    u.foto_perfil_usuario,
                    e.nombre_evento
             FROM resena_evento r
             LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
             LEFT JOIN evento e ON r.id_evento = e.id_evento
             ORDER BY r.fecha_creacion DESC
             LIMIT 20`
        );

        console.log(`✅ ${result.rows.length} reseñas obtenidas para catálogo`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener todas las reseñas:', err);
        res.status(500).json({ message: 'Error al obtener reseñas' });
    }
};

module.exports = exports;