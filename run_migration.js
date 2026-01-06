require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
});

async function runMigration() {
    try {
        const sql = fs.readFileSync('fix_columns.sql', 'utf8');
        console.log('Ejecutando migraci\u00f3n...');
        await pool.query(sql);
        console.log('\u2705 Migraci\u00f3n ejecutada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('\u274c Error:', error.message);
        process.exit(1);
    }
}

runMigration();
