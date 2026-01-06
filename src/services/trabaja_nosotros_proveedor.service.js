const model = require('../models/trabaja_nosotros_proveedor.models');

// Obtener todos los registros
exports.getAllTrabajaNosotrosProveedor = async () => {
    return await model.findAll();
};

// Obtener un registro por ID
exports.getTrabajaNosotrosProveedorById = async (id) => {
    return await model.findById(id);
};

// Crear un nuevo registro
exports.createTrabajaNosotrosProveedor = async (data) => {
    return await model.create(data);
};

// Actualizar un registro
exports.updateTrabajaNosotrosProveedor = async (id, data) => {
    return await model.update(id, data);
};

// Eliminar un registro
exports.deleteTrabajaNosotrosProveedor = async (id) => {
    return await model.delete(id);
};
