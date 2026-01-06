const service = require('../services/v_usuario.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaUsuario();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};