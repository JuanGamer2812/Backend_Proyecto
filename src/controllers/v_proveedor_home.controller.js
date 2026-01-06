const service = require('../services/v_proveedor_home.service');

// Obtener todos los proveedores para el home
exports.getAll = async(req, res) => {
    try {
        const data = await service.getAllProveedoresHome();
        res.status(200).json(data);
    } catch (err) {
        console.error('Error en v_proveedor_home.controller.getAll:', err);
        res.status(500).json({
            error: 'Error al obtener proveedores',
            details: err.message
        });
    }
};

// Obtener proveedores por categoría
exports.getByCategoria = async(req, res) => {
    try {
        const { categoria } = req.params;
        const data = await service.getProveedoresPorCategoria(categoria);
        res.status(200).json(data);
    } catch (err) {
        console.error('Error en v_proveedor_home.controller.getByCategoria:', err);
        res.status(400).json({
            error: 'Error al obtener proveedores por categoría',
            details: err.message
        });
    }
};