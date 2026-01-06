const pool = require('./src/config/db');

async function verificarFotos() {
    try {
        const query = `
            SELECT 
                p.id_proveedor,
                p.nombre,
                pt.nombre as categoria,
                CASE 
                    WHEN pi.url_imagen IS NULL THEN 'SIN FOTO'
                    WHEN trim(pi.url_imagen) = '' THEN 'FOTO VACÍA'
                    ELSE 'TIENE FOTO'
                END as estado_foto
            FROM proveedor p
            JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
            LEFT JOIN proveedor_imagen pi ON pi.id_proveedor = p.id_proveedor AND pi.es_principal = true
            WHERE p.estado = true
            ORDER BY pt.nombre, p.nombre;
        `;

        const result = await pool.query(query);

        console.log('\n=== ESTADO DE FOTOS DE PROVEEDORES ===\n');
        result.rows.forEach(row => {
            console.log(`${row.nombre.padEnd(35)} [${row.categoria.padEnd(10)}] - ${row.estado_foto}`);
        });

        console.log(`\nTotal: ${result.rows.length} proveedores`);

        const sinFoto = result.rows.filter(r => r.estado_foto.includes('SIN FOTO') || r.estado_foto.includes('VACÍA'));
        console.log(`Proveedores sin foto: ${sinFoto.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

verificarFotos();