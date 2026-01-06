const service = require('../services/v_evento_unificado.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaEventoUnificado();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};
