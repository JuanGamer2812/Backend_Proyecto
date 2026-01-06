const Model = require('../models/evento.model');

exports.getEventoByPlan = async(id_plan) => {
    return await Model.getEventoByPlan(id_plan);
};

exports.getEventosByUserId = async(userId) => {
    return await Model.findByUserId(userId);
};

exports.getEventoById = async(id) => {
    return await Model.getEventoById(id);
};

exports.getProveedoresByEvento = async(id_evento) => {
    return await Model.getProveedoresByEvento(id_evento);
};

exports.createEvento = async(data) => {
    return await Model.createEvento(data);
};

exports.createEventoProveedorBulk = async(items) => {
    return await Model.createEventoProveedorBatch(items);
};

exports.createEventoProveedorCaracteristicaBulk = async(items) => {
    return await Model.createEventoProveedorCaracteristicaBatch(items);
};

module.exports = exports;