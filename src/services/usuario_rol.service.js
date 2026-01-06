const authModel = require('../models/auth.model');

exports.assignRole = async(id_usuario, id_rol) => {
    if (!id_usuario || !id_rol) {
        throw new Error('id_usuario e id_rol son requeridos');
    }

    await authModel.assignRole(id_usuario, id_rol);
    const user = await authModel.findById(id_usuario);
    return user;
};