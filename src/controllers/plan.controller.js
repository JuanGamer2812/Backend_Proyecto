const service = require('../services/plan.service');

/**
 * GET /api/planes
 * Obtener todos los planes disponibles
 */
exports.getAll = async(req, res) => {
    try {
        const planes = await service.getAllPlanes();
        res.status(200).json(planes);
    } catch (error) {
        console.error('Error en planController.getAll:', error);
        res.status(500).json({
            message: 'Error al cargar planes',
            error: error.message
        });
    }
};

/**
 * GET /api/planes/:id
 * Obtener un plan por ID
 */
exports.getById = async(req, res) => {
    try {
        const { id } = req.params;
        const plan = await service.getPlanById(id);

        if (!plan) {
            return res.status(404).json({
                message: 'Plan no encontrado'
            });
        }

        res.status(200).json(plan);
    } catch (error) {
        console.error('Error en planController.getById:', error);
        res.status(500).json({
            message: 'Error al obtener plan',
            error: error.message
        });
    }
};