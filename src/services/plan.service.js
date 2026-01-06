const model = require('../models/plan.models');

/**
 * Obtener todos los planes
 */
exports.getAllPlanes = async() => {
    return await model.findAll();
};

/**
 * Obtener un plan por ID
 */
exports.getPlanById = async(id) => {
    return await model.findById(id);
};