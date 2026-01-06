const model = require('../models/v_usuario_rol.models');

//funcion del end-point para devolver todos los usuarios_rol de una vista
exports.getAllVistaUsuarioRol = async () => {
    return await model.findAll();
};
