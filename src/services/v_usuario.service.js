const model = require('../models/v_usuario.models');

//funcion del end-point para devolver todos los usuarios de una vista
exports.getAllVistaUsuario = async () => {
    return await model.findAll();
};
