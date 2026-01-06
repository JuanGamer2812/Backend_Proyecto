const Model = require('../models/caracteristica.model');

exports.getByTipo = async(req, res) => {
    try {
        const tipo = req.query.tipo;
        const rows = await Model.findByTipo(tipo);
        return res.status(200).json(rows);
    } catch (err) {
        console.error('Error en caracteristica.controller.getByTipo:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getByProveedor = async(req, res) => {
    try {
        const id = req.params.id;
        const data = await Model.findByProveedor(id);
        if (!data) return res.status(404).json({ error: 'Proveedor no encontrado' });
        return res.status(200).json(data);
    } catch (err) {
        console.error('Error en caracteristica.controller.getByProveedor:', err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports = exports;