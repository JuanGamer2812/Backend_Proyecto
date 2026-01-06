const { Pool } = require('pg');
require('dotenv').config();

// Defensive validation / coercion of env vars to avoid low-level pg errors
const host = process.env.PG_HOST || 'localhost';
const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;
const user = process.env.PG_USER || 'postgres';
// Ensure password is a string when provided
if (process.env.PG_PASSWORD === undefined || process.env.PG_PASSWORD === null) {
    console.warn('PG_PASSWORD no está configurado. Conexiones a la BD fallarán.');
}
const password = process.env.PG_PASSWORD !== undefined && process.env.PG_PASSWORD !== null ?
    String(process.env.PG_PASSWORD) :
    undefined;
const database = process.env.PG_DATABASE || 'eclat';

console.log('[DB Config] Connecting to PostgreSQL:', { host, port, user, database: database || 'eclat' });

const pool = new Pool({
    host,
    port,
    user: String(user),
    password,
    database: String(database),
    // Configurar encoding UTF-8 para caracteres especiales (tildes, ñ, etc.)
    client_encoding: 'UTF8',
});

// Test connection on startup
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('[DB Error] Failed to connect to database:', err.message);
    } else {
        console.log('[DB OK] Connected to database successfully');
    }
});

module.exports = pool;