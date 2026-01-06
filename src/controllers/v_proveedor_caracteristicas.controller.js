const Model = require('../models/v_proveedor_caracteristicas.model');

const VProveedorCaracteristicasController = {
    getByProveedor: async(req, res) => {
        try {
            const id = req.query.id_proveedor || req.query.idProveedor || req.query.id;
            if (!id) return res.status(400).json({ error: 'id_proveedor es requerido' });

            const rows = await Model.getByProveedor(id);
            res.status(200).json(rows);
        } catch (err) {
            console.error('Error en v_proveedor_caracteristicas.controller.getByProveedor:', err);
            res.status(500).json({ message: 'Error al obtener características', error: err.message });
        }
    }
};

module.exports = VProveedorCaracteristicasController;