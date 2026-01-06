const db = require('../config/db');

exports.findAll = async() => {
    const result = await db.query('SELECT * FROM trabaja_nosotros_proveedor');
    return result.rows;
};

exports.findById = async(id) => {
    const result = await db.query(
        'SELECT * FROM trabaja_nosotros_proveedor WHERE id_postu_proveedor = $1', [id]
    );
    return result.rows[0];
};

exports.create = async(data) => {
    const {
        categoria_postu_proveedor,
        nom_empresa_postu_proveedor,
        correo_postu_proveedor,
        portafolio_postu_proveedor,
        portafolio_link_postu_proveedor,
        portafolio_file_postu_proveedor,
        fecha_postu_proveedor
    } = data;

    const result = await db.query(
        `INSERT INTO trabaja_nosotros_proveedor 
        (categoria_postu_proveedor, nom_empresa_postu_proveedor, correo_postu_proveedor, 
         portafolio_postu_proveedor, portafolio_link_postu_proveedor, portafolio_file_postu_proveedor, 
         fecha_postu_proveedor) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`, [
            categoria_postu_proveedor,
            nom_empresa_postu_proveedor,
            correo_postu_proveedor,
            portafolio_postu_proveedor,
            portafolio_link_postu_proveedor || null,
            portafolio_file_postu_proveedor || null,
            fecha_postu_proveedor || new Date()
        ]
    );
    return result.rows[0];
};

exports.update = async(id, data) => {
    const {
        categoria_postu_proveedor,
        nom_empresa_postu_proveedor,
        correo_postu_proveedor,
        portafolio_postu_proveedor,
        fecha_postu_proveedor
    } = data;

    const result = await db.query(
        `UPDATE trabaja_nosotros_proveedor 
        SET categoria_postu_proveedor = $1, nom_empresa_postu_proveedor = $2, correo_postu_proveedor = $3, 
            portafolio_postu_proveedor = $4, fecha_postu_proveedor = $5
        WHERE id_postu_proveedor = $6 
        RETURNING *`, [categoria_postu_proveedor, nom_empresa_postu_proveedor, correo_postu_proveedor, portafolio_postu_proveedor, fecha_postu_proveedor, id]
    );
    return result.rows[0];
};

exports.delete = async(id) => {
    const result = await db.query(
        'DELETE FROM trabaja_nosotros_proveedor WHERE id_postu_proveedor = $1 RETURNING *', [id]
    );
    return result.rows[0];
};