const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function fixPermisosRoles() {
    try {
        console.log('Corrigiendo permisos de roles...');

        const sqlPath = path.join(__dirname, 'fix_permisos_roles.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('Permisos corregidos. Verificando...');
        const result = await pool.query(`
      SELECT 
        r.id_rol,
        r.nombre_rol,
        ARRAY_AGG(rp.id_permiso ORDER BY rp.id_permiso) as permisos
      FROM rol r
      LEFT JOIN rol_permiso rp ON r.id_rol = rp.id_rol
      WHERE r.id_rol IN (1, 2)
      GROUP BY r.id_rol, r.nombre_rol
      ORDER BY r.id_rol
    `);

        console.table(result.rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message || error);
        process.exit(1);
    }
}

fixPermisosRoles();