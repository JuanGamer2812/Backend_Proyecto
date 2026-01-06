const db = require('../config/db');

/**
 * Inserta una nueva postulación de proveedor en trabaja_nosotros_proveedor
 */
exports.createProveedor = async(data) => {
    const {
        categoria_postu_proveedor,
        nom_empresa_postu_proveedor,
        correo_postu_proveedor,
        portafolio_postu_proveedor,
        portafolio_link_postu_proveedor,
        portafolio_file_postu_proveedor
    } = data;

    const result = await db.query(
        `INSERT INTO trabaja_nosotros_proveedor 
        (categoria_postu_proveedor, nom_empresa_postu_proveedor, correo_postu_proveedor, 
         portafolio_postu_proveedor, portafolio_link_postu_proveedor, portafolio_file_postu_proveedor, 
         fecha_postu_proveedor) 
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE) 
        RETURNING *`, [
            categoria_postu_proveedor,
            nom_empresa_postu_proveedor,
            correo_postu_proveedor,
            portafolio_postu_proveedor,
            portafolio_link_postu_proveedor || null,
            portafolio_file_postu_proveedor || null
        ]
    );
    return result.rows[0];
};

/**
 * Inserta una nueva postulación de trabajador en trabaja_nosotros_trabajador
 */
exports.createTrabajador = async(data) => {
    const {
        cedula_postu_trabajador,
        nombre1_postu_trabajador,
        nombre2_postu_trabajador,
        apellido1_postu_trabajador,
        apellido2_postu_trabajador,
        fecha_naci_postu_trabajador,
        correo_postu_trabajador,
        telefono_postu_trabajador,
        cv_postu_trabajador
    } = data;

    const result = await db.query(
        `INSERT INTO trabaja_nosotros_trabajador 
        (cedula_postu_trabajador, nombre1_postu_trabajador, nombre2_postu_trabajador,
         apellido1_postu_trabajador, apellido2_postu_trabajador, fecha_naci_postu_trabajador,
         correo_postu_trabajador, telefono_postu_trabajador, cv_postu_trabajador, 
         fecha_postu_trabajador) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) 
        RETURNING *`, [
            cedula_postu_trabajador,
            nombre1_postu_trabajador,
            nombre2_postu_trabajador || null,
            apellido1_postu_trabajador,
            apellido2_postu_trabajador || null,
            fecha_naci_postu_trabajador,
            correo_postu_trabajador,
            telefono_postu_trabajador,
            cv_postu_trabajador || null
        ]
    );
    return result.rows[0];
};