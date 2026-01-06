const db = require('../config/db');

exports.findAll = async() => {
    try {
        const result = await db.query(
            `SELECT 
                u.id_usuario,
                u.nombre_usuario,
                u.apellido_usuario,
                u.genero_usuario,
                u.fecha_nacimiento_usuario,
                u.correo_usuario,
                u.telefono_usuario,
                u.foto_perfil_usuario AS foto,
                u.fecha_registro_usuario,
                u.estado_usuario,
                ur.id_rol,
                r.nombre_rol
            FROM usuario u
            LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
            LEFT JOIN rol r ON r.id_rol = ur.id_rol
            ORDER BY u.id_usuario ASC`
        );
        return result.rows;
    } catch (err) {
        console.error('[usuario.models] findAll error:', err);
        throw err;
    }
};

exports.findById = async(id) => {
    try {
        const result = await db.query(
            `SELECT 
                u.id_usuario,
                u.nombre_usuario,
                u.apellido_usuario,
                u.genero_usuario,
                u.fecha_nacimiento_usuario,
                u.correo_usuario,
                u.telefono_usuario,
                u.foto_perfil_usuario AS foto,
                u.fecha_registro_usuario,
                u.estado_usuario,
                ur.id_rol,
                r.nombre_rol
            FROM usuario u
            LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
            LEFT JOIN rol r ON r.id_rol = ur.id_rol
            WHERE u.id_usuario = $1`, [id]
        );
        return result.rows[0];
    } catch (err) {
        console.error('[usuario.models] findById error:', err);
        throw err;
    }
};