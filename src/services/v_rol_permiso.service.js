const model = require('../models/v_rol_permiso.models');

//funcion del end-point para devolver todos los roles_permisos de una vista
exports.getAllVistaRolPermiso = async () => {
    return await model.findAll();
};
