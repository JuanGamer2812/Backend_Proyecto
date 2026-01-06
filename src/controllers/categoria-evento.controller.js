const db = require('../config/db');

const tableExists = async(tableName) => {
    const result = await db.query('SELECT to_regclass($1) as reg', [`public.${tableName}`]);
    return Boolean(result.rows[0] && result.rows[0].reg);
};

const detectCategoriaEventoColumns = async() => {
    if (!await tableExists('categoria_evento')) {
        throw new Error('La tabla categoria_evento no existe');
    }

    const { rows } = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'categoria_evento'
    `);

    const cols = rows.map(r => r.column_name);
    const idCol = cols.find(c => c === 'id_categoria') || cols.find(c => c === 'categoria_evento_id') || cols.find(c => c === 'id');
    const nameCol = cols.find(c => c === 'nombre') || cols.find(c => c === 'nombre_categoria') || cols.find(c => c === 'categoria') || cols.find(c => c === 'tipo');
    const descCol = cols.find(c => c === 'descripcion') || cols.find(c => c === 'descripcion_categoria') || null;
    const iconoCol = cols.find(c => c === 'icono') || null;
    const colorCol = cols.find(c => c === 'color') || null;
    const activoCol = cols.find(c => c === 'activo') || null;

    if (!idCol || !nameCol) {
        throw new Error('La tabla categoria_evento no tiene columnas de id o nombre reconocibles');
    }

    return { idCol, nameCol, descCol, iconoCol, colorCol, activoCol };
};

const CategoriaEventoController = {
    getCategoriasEvento: async(_req, res) => {
        try {
            const { idCol, nameCol, descCol, iconoCol, colorCol, activoCol } = await detectCategoriaEventoColumns();

            const descSelect = descCol ? `${descCol} AS descripcion` : 'NULL::text AS descripcion';
            const iconoSelect = iconoCol ? `${iconoCol} AS icono` : 'NULL::text AS icono';
            const colorSelect = colorCol ? `${colorCol} AS color` : 'NULL::text AS color';
            const activoSelect = activoCol ? `${activoCol} AS activo` : 'true AS activo';
            const activoWhere = activoCol ? `WHERE ${activoCol} = true` : '';

            const sql = `
                SELECT ${idCol} AS id_categoria, ${nameCol} AS nombre, ${descSelect}, ${iconoSelect}, ${colorSelect}, ${activoSelect}
                FROM categoria_evento
                ${activoWhere}
                ORDER BY ${idCol} ASC
            `;

            const { rows } = await db.query(sql);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error en CategoriaEventoController.getCategoriasEvento:', error);
            res.status(500).json({
                message: 'Error al obtener categorías de evento',
                error: error.message
            });
        }
    }
};

module.exports = CategoriaEventoController;