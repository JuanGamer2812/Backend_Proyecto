// Eliminar un rol existente
exports.deleteRol = async(id) => {
    return await model.deleteById(id);
};
// Crear un nuevo rol
exports.createRol = async(data) => {
    return await model.create(data);
};
// Obtener todos los roles ordenados por id_rol ascendente
exports.getAllRolOrdered = async() => {
    return await model.findAllOrdered();
};
// Actualizar un rol existente
exports.updateRol = async(id, data) => {
    return await model.updateById(id, data);
};
const model = require('../models/rol.models');

//funcion del end-point para devolver todos los roles
exports.getAllRol = async() => {
    return await model.findAll();
};