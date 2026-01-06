const Model = require('../models/proveedor_tipo.model');

const ProveedorTipoController = {
    getAll: async(req, res) => {
        try {
            const rows = await Model.findAll();
            res.status(200).json(rows);
        } catch (err) {
            console.error('Error en proveedor_tipo.controller.getAll:', err);
            res.status(500).json({ message: 'Error al obtener tipos de proveedor', error: err.message });
        }
    }
};

module.exports = ProveedorTipoController;