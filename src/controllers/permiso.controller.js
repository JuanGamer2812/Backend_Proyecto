const service = require('../services/permiso.service');
const pool = require('../config/db');

exports.deletePermiso = async(req, res) => {
    try {
        const { id } = req.params;
        const deleted = await service.deletePermiso(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Permiso no encontrado' });
        }
        // Obtener la lista completa de permisos actualizada
        const result = await pool.query('SELECT id_permiso, nombre_permiso, descripcion_permiso, fecha_registro_permiso FROM permiso ORDER BY id_permiso');
        const allPermisos = result.rows.map(row => ({
            id_permiso: row.id_permiso,
            nombre_permiso: row.nombre_permiso,
            descripcion_permiso: row.descripcion_permiso,
            fecha_registro_permiso: row.fecha_registro_permiso
        }));
        res.json({ message: 'Permiso eliminado', permiso: deleted, permisos: allPermisos });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar permiso', error: err.message });
    }
};