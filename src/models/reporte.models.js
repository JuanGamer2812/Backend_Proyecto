const db = require('../config/db');

/**
 * Verifica si una tabla existe en el esquema público.
 */
const tableExists = async(tableName) => {
    const result = await db.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
    return Boolean(result.rows[0]?.reg);
};

/**
 * Obtiene todas las postulaciones de proveedores.
 */
exports.getProveedoresRaw = async() => {
    const exists = await tableExists('trabaja_nosotros_proveedor');
    if (!exists) {
        return { rows: [], table: null, tableMissing: true };
    }

    const result = await db.query('SELECT * FROM trabaja_nosotros_proveedor');
    return { rows: result.rows, table: 'trabaja_nosotros_proveedor', tableMissing: false };
};

/**
 * Obtiene postulaciones de trabajadores (con fallback a tabla usuario).
 */
exports.getTrabajadoresRaw = async() => {
    const candidateTables = [
        'postulacion_trabajador',
        'trabaja_nosotros_trabajador',
        'trabajadores_postulacion'
    ];

    for (const table of candidateTables) {
        const exists = await tableExists(table);
        if (!exists) continue;

        const result = await db.query(`SELECT * FROM ${table}`);
        return { rows: result.rows, table, tableMissing: false };
    }

    // Fallback: usar tabla de usuarios con rol "trabajador"
    try {
        const result = await db.query(`
            SELECT 
                u.id_usuario,
                NULL::text AS cedula,
                u.nombre_usuario AS nombres,
                u.apellido_usuario AS apellidos,
                to_char(u.fecha_nacimiento_usuario, 'YYYY-MM-DD') AS fecha_nacimiento,
                u.correo_usuario AS correo,
                u.telefono_usuario AS telefono,
                NULL::text AS cv_url,
                u.fecha_registro_usuario AS fecha_postulacion,
                r.nombre_rol
            FROM usuario u
            LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
            LEFT JOIN rol r ON r.id_rol = ur.id_rol
            WHERE (ur.id_rol = 2 OR UPPER(COALESCE(r.nombre_rol,'')) LIKE '%TRABAJADOR%')
        `);

        if (result.rows.length > 0) {
            return { rows: result.rows, table: 'usuario (rol trabajador)', tableMissing: false };
        }
    } catch (err) {
        console.warn('[reporte.models] Fallback usuario rol trabajador falló:', err.message);
    }

    return { rows: [], table: null, tableMissing: true };
};