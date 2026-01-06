const Categoria = require('../models/categoria.models');

/**
 * Controlador para Categorías desde proveedor_tipo
 */

const normalizeCategoria = (value) => {
    const normalized = String(value || 'OTRO')
        .normalize('NFD')
        .replace(/[^\w\s]/g, '')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    const map = {
        MUSICA: 'MUSICA',
        CATERING: 'CATERING',
        DECORACION: 'DECORACION',
        LUGAR: 'LUGAR',
        FOTOGRAFIA: 'FOTOGRAFIA',
        VIDEO: 'VIDEO'
    };
    return map[normalized] || normalized;
};

const CategoriaController = {
    /**
     * GET /api/categorias
     * Obtener todas las categorías con iconos
     */
    getCategorias: async(req, res) => {
        try {
            const categorias = await Categoria.findAll();
            const normalized = (categorias || []).map((c) => ({
                id_categoria: c.id_categoria,
                nombre: normalizeCategoria(c.nombre),
                icono: normalizeCategoria(c.icono)
            }));
            res.status(200).json(normalized);
        } catch (error) {
            console.error('Error en CategoriaController.getCategorias:', error);
            res.status(500).json({
                message: 'Error al cargar categorías',
                error: error.message
            });
        }
    },

    /**
     * GET /api/categorias/:nombre
     * Obtener categoría por nombre
     */
    getCategoriaByName: async(req, res) => {
        try {
            const { nombre } = req.params;
            const categoria = await Categoria.findByName(nombre);

            if (!categoria) {
                return res.status(404).json({
                    message: 'Categoría no encontrada'
                });
            }

            res.status(200).json(categoria);
        } catch (error) {
            console.error('Error en CategoriaController.getCategoriaByName:', error);
            res.status(500).json({
                message: 'Error al obtener categoría',
                error: error.message
            });
        }
    }
};

module.exports = CategoriaController;