require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'root',
    database: process.env.PG_DATABASE || 'eclat'
});

async function addArchivosPathsColumn() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar si la columna existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trabaja_nosotros_proveedor' 
            AND column_name = 'archivos_paths'
        `);

        if (checkColumn.rows.length === 0) {
            // La columna no existe, agregarla
            await client.query(`
                ALTER TABLE trabaja_nosotros_proveedor
                ADD COLUMN archivos_paths JSONB
            `);
            console.log('✅ Columna archivos_paths agregada correctamente');
        } else {
            console.log('ℹ️  La columna archivos_paths ya existe');
        }

        await client.query('COMMIT');
        console.log('✅ Migración completada exitosamente');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en la migración:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addArchivosPathsColumn()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });