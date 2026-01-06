const model = require('../models/permiso.models');
const pool = require('../config/db');

exports.deletePermiso = async(id) => {
    return await model.deleteById(id);
};