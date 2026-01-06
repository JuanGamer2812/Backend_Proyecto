const db = require('../config/db');

const ProveedorTipo = {
    findAll: async() => {
        try {
            const colsRes = await db.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'proveedor_tipo'
            `);

            const cols = (colsRes.rows || []).map(r => r.column_name);

            const idCol = cols.find(c => c === 'id_tipo') || cols.find(c => c === 'id') || 'id_tipo';
            const nameCol = cols.find(c => c === 'nombre') || cols.find(c => c === 'tipo') || 'nombre';
            const descCol = cols.find(c => c === 'descripcion') || cols.find(c => c === 'detalle') || null;
            const activoCol = cols.find(c => c === 'activo') || null;

            const descSelect = descCol ? `${descCol} AS descripcion` : 'NULL::text AS descripcion';
            const activoSelect = activoCol ? `${activoCol} AS activo` : 'true AS activo';

            const sql = `
                SELECT ${idCol} AS id_tipo, ${nameCol} AS nombre, ${descSelect}, ${activoSelect}
                FROM proveedor_tipo
                ORDER BY ${idCol} ASC
            `;

            const result = await db.query(sql);
            return result.rows;
        } catch (error) {
            console.error('Error en ProveedorTipo.findAll:', error);
            // Fallback: intentar una consulta sencilla que solo devuelva nombre e id_tipo si es posible
            try {
                const fallback = await db.query(`SELECT id_tipo, nombre FROM proveedor_tipo ORDER BY id_tipo ASC`);
                return fallback.rows;
            } catch (err) {
                console.error('Fallback failed in ProveedorTipo.findAll:', err);
                return [];
            }
        }
    }
};

module.exports = ProveedorTipo;