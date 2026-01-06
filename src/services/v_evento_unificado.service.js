const model = require('../models/v_evento_unificado.models');

//funcion del end-point para devolver todos los eventos unificados de una vista
exports.getAllVistaEventoUnificado = async () => {
    return await model.findAll();
};
