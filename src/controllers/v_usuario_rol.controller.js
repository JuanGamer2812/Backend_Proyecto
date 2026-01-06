const service = require('../services/v_usuario_rol.service');

exports.getAll = async (req, res) => {
    try{
        const data = await service.getAllVistaUsuarioRol();
        res.json(data);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
};