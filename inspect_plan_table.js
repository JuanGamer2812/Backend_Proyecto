require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'root',
    database: process.env.PG_DATABASE || 'eclat'
});

(async() => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'plan'
            ORDER BY ordinal_position
        `);
        const fs = require('fs');
        fs.writeFileSync('plan_columns.json', JSON.stringify(res.rows, null, 2));
        console.log('Wrote plan columns to plan_columns.json');
    } catch (e) {
        const fs = require('fs');
        fs.writeFileSync('plan_columns.json', JSON.stringify({ error: e.message }, null, 2));
        console.error('Error inspecting plan table:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
})();