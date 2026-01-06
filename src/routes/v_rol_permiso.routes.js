const express = require('express');
const router = express.Router();

const pool = require('../config/db'); // ajusta la ruta si tu config está en otra carpeta
const { authenticateToken } = require('../middlewares/auth.middleware');

// Upsert (crear o eliminar relación en rol_permiso según estado booleano)
router.post('/', authenticateToken, async(req, res) => {
    try {
        const { id_rol, id_permiso, estado } = req.body;
        if (!id_rol || !id_permiso) return res.status(400).json({ message: 'id_rol e id_permiso requeridos' });

        const rolId = Number(id_rol);
        const permisoId = Number(id_permiso);

        // Definir permisos exclusivos de Administrador (id_rol=1)
        const PERMISOS_SOLO_ADMIN = [4, 8, 9]; // EVENTO_ELIMINAR, USUARIO_GESTIONAR, CATALOGO_GESTIONAR
        const ROL_ADMIN = 1;
        const ROL_USUARIO = 2;

        // Regla 1: NO se pueden quitar NINGÚN permiso al rol Administrador (protección total)
        if (rolId === ROL_ADMIN && estado === false) {
            return res.status(400).json({
                message: 'No se pueden desasignar permisos del rol Administrador.'
            });
        }

        // Regla 2: Permisos exclusivos de admin (4,8,9) NO se pueden asignar a otros roles
        if (PERMISOS_SOLO_ADMIN.includes(permisoId) && rolId !== ROL_ADMIN && estado === true) {
            return res.status(400).json({
                message: 'Este permiso solo puede asignarse al rol Administrador.'
            });
        }

        // Validar que el permiso existe en la tabla permiso
        const permisoCheck = await pool.query('SELECT 1 FROM permiso WHERE id_permiso = $1', [permisoId]);
        if (permisoCheck.rowCount === 0) {
            return res.status(400).json({ message: 'El permiso no existe.' });
        }

        // The table `rol_permiso` stores the relation (id_rol, id_permiso).
        // There is no `estado` column in the table; interpret `estado` boolean as:
        // - true: ensure the relation exists (INSERT if not exists)
        // - false: ensure the relation is removed (DELETE if exists)
        if (estado) {
            // insert if not exists
            const insertSql = `INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id_rol, id_permiso`;
            const insertRes = await pool.query(insertSql, [id_rol, id_permiso]);
            if (insertRes.rows.length > 0) return res.status(201).json({ action: 'inserted', ...insertRes.rows[0] });
            // already existed
            return res.json({ action: 'exists', id_rol: Number(id_rol), id_permiso: Number(id_permiso) });
        } else {
            // remove the relation if exists
            const delRes = await pool.query(`DELETE FROM rol_permiso WHERE id_rol = $1 AND id_permiso = $2 RETURNING id_rol, id_permiso`, [id_rol, id_permiso]);
            if (delRes.rows.length > 0) return res.json({ action: 'deleted', ...delRes.rows[0] });
            return res.json({ action: 'not_found' });
        }
    } catch (err) {
        console.error('rol_permiso POST error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Obtener permisos por rol
router.get('/:idRol', authenticateToken, async(req, res) => {
    try {
        const { idRol } = req.params;
        console.log('[v_rol_permiso] requested idRol =', idRol);
        // show existing rol_permiso rows for this role to debug assignment
        try {
            const rpResDbg = await pool.query('SELECT id_rol, id_permiso FROM rol_permiso WHERE id_rol = $1 ORDER BY id_permiso', [idRol]);
            console.log('[v_rol_permiso] rol_permiso rows for role:', rpResDbg.rows);
        } catch (e) {
            console.warn('[v_rol_permiso] could not query rol_permiso for debug:', e.message || e);
        }

        // Query: return all permisos with id_permiso y asignado_permiso booleano
        const q = `
            SELECT 
                p.id_permiso,
                p.nombre_permiso,
                p.descripcion_permiso,
                p.fecha_registro_permiso,
                (rp.id_rol IS NOT NULL) AS asignado_permiso
            FROM permiso p
            LEFT JOIN rol_permiso rp ON rp.id_permiso = p.id_permiso AND rp.id_rol = $1
            ORDER BY p.id_permiso
        `;
        const result = await pool.query(q, [idRol]);
        // Solo los campos requeridos por el frontend, id_permiso consistente
        const permisos = result.rows.map(row => ({
            id_permiso: row.id_permiso,
            asignado_permiso: Boolean(row.asignado_permiso)
        }));
        res.json(permisos);
    } catch (err) {
        console.error('rol_permiso GET by role error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Eliminar relación (opcional)
router.delete('/:idRol/:idPermiso', authenticateToken, async(req, res) => {
    try {
        const { idRol, idPermiso } = req.params;
        await pool.query(`DELETE FROM rol_permiso WHERE id_rol = $1 AND id_permiso = $2`, [idRol, idPermiso]);
        res.status(204).send();
    } catch (err) {
        console.error('rol_permiso DELETE error:', err);
        res.status(500).json({ message: err.message });
    }
});


// Obtener todas las relaciones rol-permiso (con nombre de rol, nombre de permiso y estado)
// GET /api/v_rol_permiso
router.get('/', authenticateToken, async(req, res) => {
    try {
        /*
        Devuelve una lista de todas las combinaciones posibles de rol y permiso,
        con el estado (true/false) indicando si la relación existe en rol_permiso.
        */
        const query = `
            SELECT r.id_rol, r.nombre_rol, p.id_permiso, p.nombre_permiso,
                   (rp.id_rol IS NOT NULL) AS estado
            FROM rol r
            CROSS JOIN permiso p
            LEFT JOIN rol_permiso rp ON rp.id_rol = r.id_rol AND rp.id_permiso = p.id_permiso
            ORDER BY r.id_rol, p.id_permiso
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('v_rol_permiso GET ALL error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;