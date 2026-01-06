const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'administrador',
  database: 'eclat'
});

async function alterColumn() {
  try {
    console.log('Ampliando columna contraseña_usuario de VARCHAR(50) a VARCHAR(255)...');
    
    await pool.query('ALTER TABLE usuario ALTER COLUMN "contraseña_usuario" TYPE VARCHAR(255)');
    
    console.log('✓ Columna ampliada exitosamente');
    
  } catch (error) {
    console.error('Error al ampliar columna:', error.message);
  } finally {
    await pool.end();
  }
}

alterColumn();
