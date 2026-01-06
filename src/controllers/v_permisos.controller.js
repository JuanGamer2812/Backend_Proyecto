const service = require('../services/v_permisos.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaPermisos();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};
