const service = require('../services/v_roles.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaRoles();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};
