// Eliminar un rol por ID
exports.deleteById = async(id) => {
    const sql = 'DELETE FROM rol WHERE id_rol = $1 RETURNING *';
    const result = await db.query(sql, [id]);
    return result.rows[0] || null;
};
// Crear un nuevo rol
exports.create = async(data) => {
    const campos = [];
    const valores = [];
    const placeholders = [];
    let idx = 1;
    if (data.nombre_rol !== undefined) {
        campos.push('nombre_rol');
        valores.push(data.nombre_rol);
        placeholders.push(`$${idx++}`);
    }
    if (data.descripcion_rol !== undefined) {
        campos.push('descripcion_rol');
        valores.push(data.descripcion_rol);
        placeholders.push(`$${idx++}`);
    }
    if (data.estado_rol !== undefined) {
        campos.push('estado_rol');
        valores.push(data.estado_rol);
        placeholders.push(`$${idx++}`);
    }
    if (!campos.includes('nombre_rol')) {
        throw new Error('nombre_rol es requerido');
    }
    const sql = `INSERT INTO rol (${campos.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await db.query(sql, valores);
    return result.rows[0];
};
// Obtener todos los roles ordenados por id_rol ascendente
exports.findAllOrdered = async() => {
    const result = await db.query('SELECT * FROM rol ORDER BY id_rol ASC');
    return result.rows;
};
const db = require('../config/db');


// Actualizar un rol por ID (campos editables: nombre_rol, descripcion_rol, estado_rol)
exports.updateById = async(id, data) => {
    // Construir dinámicamente el SET para los campos presentes
    const campos = [];
    const valores = [];
    let idx = 1;
    if (data.nombre_rol !== undefined) {
        campos.push(`nombre_rol = $${idx++}`);
        valores.push(data.nombre_rol);
    }
    if (data.descripcion_rol !== undefined) {
        campos.push(`descripcion_rol = $${idx++}`);
        valores.push(data.descripcion_rol);
    }
    if (data.estado_rol !== undefined) {
        campos.push(`estado_rol = $${idx++}`);
        valores.push(data.estado_rol);
    }
    if (campos.length === 0) return null;
    valores.push(id);
    const sql = `UPDATE rol SET ${campos.join(', ')} WHERE id_rol = $${idx} RETURNING *`;
    const result = await db.query(sql, valores);
    return result.rows[0] || null;
};

exports.findAll = async() => {
    const result = await db.query('SELECT * FROM rol');
    return result.rows;
};