const service = require('../services/v_rol_permiso.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaRolPermiso();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};
