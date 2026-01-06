const model = require('../models/usuario.models');

exports.getAllUsuario = async () => {
    return await model.findAll();
};

exports.getUsuarioById = async (id) => {
    return await model.findById(id);
};
