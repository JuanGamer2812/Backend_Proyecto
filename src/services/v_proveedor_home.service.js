const model = require('../models/v_proveedor_home.models');

// Obtener todos los proveedores para el home
exports.getAllProveedoresHome = async() => {
    try {
        return await model.findAll();
    } catch (error) {
        console.error('Error en getAllProveedoresHome:', error);
        const transientCodes = ['42P01', 'ECONNREFUSED', 'ETIMEDOUT', '28P01'];
        if (error && transientCodes.includes(error.code)) {
            console.warn(`Fallo transitorio/estructura (${error.code}). Devolviendo lista vacía.`);
            return [];
        }
        throw error;
    }
};

// Obtener proveedores por categoría
exports.getProveedoresPorCategoria = async(categoria) => {
    try {
        return await model.findByCategoria(categoria);
    } catch (error) {
        console.error('Error en getProveedoresPorCategoria:', error);
        const transientCodes = ['42P01', 'ECONNREFUSED', 'ETIMEDOUT', '28P01'];
        if (error && transientCodes.includes(error.code)) {
            console.warn(`Fallo transitorio/estructura (${error.code}). Devolviendo lista vacía.`);
            return [];
        }
        throw error;
    }
};