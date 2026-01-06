const service = require('../services/usuario_rol.service');
const { resolveRole } = require('../utils/roles.util');

exports.assign = async(req, res) => {
    try {
        const { id_usuario, id_rol } = req.body;
        const parsedIdRol = Number(id_rol);

        if (!id_usuario || !parsedIdRol) {
            return res.status(400).json({ error: 'id_usuario e id_rol son requeridos' });
        }

        const user = await service.assignRole(Number(id_usuario), parsedIdRol);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const roleName = resolveRole(parsedIdRol, user?.nombre_rol, user?.rol_legacy);

        res.status(200).json({
            message: 'Rol asignado correctamente',
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                telefono: user.telefono,
                id_rol: parsedIdRol,
                role: roleName,
                foto: user.foto || null
            }
        });
    } catch (err) {
        console.error('Error asignando rol:', err);
        res.status(500).json({ error: err.message || 'Error interno', detail: err.detail || null });
    }
};