const model = require('../models/v_roles.models');

//funcion del end-point para devolver todos los roles de una vista
exports.getAllVistaRoles = async () => {
    return await model.findAll();
};
