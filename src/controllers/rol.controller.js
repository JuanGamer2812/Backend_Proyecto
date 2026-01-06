// Eliminar un rol existente
exports.deleteRol = async(req, res) => {
    try {
        const { id } = req.params;
        const deleted = await service.deleteRol(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        // Obtener la lista completa de roles actualizada
        const allRoles = await service.getAllRolOrdered();
        res.json({ message: 'Rol eliminado', rol: deleted, roles: allRoles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Crear un nuevo rol
exports.createRol = async(req, res) => {
    try {
        const { nombre_rol, descripcion_rol, estado_rol } = req.body;
        if (!nombre_rol || typeof nombre_rol !== 'string') {
            return res.status(400).json({ message: 'nombre_rol es requerido y debe ser texto' });
        }
        const nuevoRol = await service.createRol({ nombre_rol, descripcion_rol, estado_rol });
        // Obtener la lista completa de roles actualizada
        const allRoles = await service.getAllRolOrdered();
        res.status(201).json({ message: 'Rol creado', rol: nuevoRol, roles: allRoles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const service = require('../services/rol.service');

// Actualizar un rol existente
exports.updateRol = async(req, res) => {
    try {
        const { id } = req.params;
        const campos = {};
        if (req.body.nombre_rol !== undefined) {
            if (typeof req.body.nombre_rol !== 'string') {
                return res.status(400).json({ message: 'nombre_rol debe ser texto' });
            }
            campos.nombre_rol = req.body.nombre_rol;
        }
        if (req.body.descripcion_rol !== undefined) {
            campos.descripcion_rol = req.body.descripcion_rol;
        }
        if (req.body.estado_rol !== undefined) {
            campos.estado_rol = req.body.estado_rol;
        }
        if (Object.keys(campos).length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos válidos para actualizar' });
        }
        const updated = await service.updateRol(id, campos);
        if (!updated) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        // Obtener la lista completa de roles actualizada
        const allRoles = await service.getAllRolOrdered();
        res.json({ message: 'Rol actualizado', rol: updated, roles: allRoles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAll = async(req, res) => {
    try {
        const data = await service.getAllRolOrdered();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};