const { Pool } = require('pg');

const pool = new Pool({
  host: 'interchange.proxy.rlwy.net',
  port: 41578,
  user: 'postgres',
  password: 'tQofnjmElPJOEZpCXKfqMSpncpxxDXrh',
  database: 'railway_ec',
  client_encoding: 'UTF8'
});

async function checkTable() {
  try {
    console.log('Verificando estructura de la tabla usuario...\n');
    
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuario' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('Columnas de la tabla usuario:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Ver el primer usuario
    console.log('\nPrimer usuario en la tabla:');
    const userQuery = 'SELECT * FROM usuario WHERE id_usuario = 1 LIMIT 1';
    const userResult = await pool.query(userQuery);
    
    if (userResult.rows.length > 0) {
      console.log(JSON.stringify(userResult.rows[0], null, 2));
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTable();
