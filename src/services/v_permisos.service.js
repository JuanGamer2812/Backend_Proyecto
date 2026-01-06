const model = require('../models/v_permisos.models');

//funcion del end-point para devolver todos los permisos de una vista
exports.getAllVistaPermisos = async () => {
    return await model.findAll();
};
