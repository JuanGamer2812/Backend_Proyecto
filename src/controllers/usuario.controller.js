const service = require('../services/usuario.service');
const { makeAbsoluteUrl } = require('../utils/url.util');
const mapGeneroToCode = (g) => {
    if (!g) return null;
    const s = String(g).toLowerCase();
    if (s === 'masculino' || s === 'm') return 'M';
    if (s === 'femenino' || s === 'f') return 'F';
    return 'Otros';
};

exports.getAll = async(req, res) => {
    try {
        console.log('[usuario.controller] getAll called');
        const data = await service.getAllUsuario();
        console.log('[usuario.controller] getAll raw data type:', Array.isArray(data) ? 'array' : typeof data, 'len:', Array.isArray(data) ? data.length : 'n/a');
        const mapped = data.map(u => ({
            id_usuario: u.id_usuario,
            nombre: u.nombre_usuario,
            apellido: u.apellido_usuario,
            genero: mapGeneroToCode(u.genero_usuario),
            fecha_nacimiento: u.fecha_nacimiento_usuario ? String(u.fecha_nacimiento_usuario).substring(0, 10) : null,
            email: u.correo_usuario,
            telefono: u.telefono_usuario,
            foto: u.foto ? makeAbsoluteUrl(u.foto) : null,
            fecha_registro: u.fecha_registro_usuario,
            activo: u.estado_usuario,
            id_rol: u.id_rol || null,
            rol_nombre: u.nombre_rol || null
        }));
        res.json(mapped);
    } catch (err) {
        console.error('[usuario.controller] getAll error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async(req, res) => {
    try {
        console.log('[usuario.controller] getById called', req.params);
        const { id } = req.params;
        const data = await service.getUsuarioById(id);

        if (!data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const mapped = {
            id_usuario: data.id_usuario,
            nombre: data.nombre_usuario,
            apellido: data.apellido_usuario,
            genero: mapGeneroToCode(data.genero_usuario),
            fecha_nacimiento: data.fecha_nacimiento_usuario ? String(data.fecha_nacimiento_usuario).substring(0, 10) : null,
            email: data.correo_usuario,
            telefono: data.telefono_usuario,
            foto: data.foto ? makeAbsoluteUrl(data.foto) : null,
            fecha_registro: data.fecha_registro_usuario,
            activo: data.estado_usuario,
            id_rol: data.id_rol || null,
            rol_nombre: data.nombre_rol || null
        };

        res.json(mapped);
    } catch (err) {
        console.error('[usuario.controller] getById error:', err);
        res.status(500).json({ error: err.message });
    }
};