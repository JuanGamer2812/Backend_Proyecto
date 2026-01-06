const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Credenciales de Railway directamente
const pool = new Pool({
  host: 'interchange.proxy.rlwy.net',
  port: 41578,
  user: 'postgres',
  password: 'tQofnjmElPJOEZpCXKfqMSpncpxxDXrh',
  database: 'railway_ec',
  client_encoding: 'UTF8'
});

async function fixAdminPassword() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Password: @Admin123
    const plainPassword = '@Admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('🔐 Contraseña hasheada generada');
    console.log('   Hash:', hashedPassword);
    
    // Actualizar el usuario admin (id_usuario = 1)
    const query = `
      UPDATE usuario 
      SET contrasena_usuario = $1 
      WHERE id_usuario = 1
      RETURNING id_usuario, correo_usuario, nombre_usuario, apellido_usuario;
    `;
    
    const result = await pool.query(query, [hashedPassword]);
    
    if (result.rows.length > 0) {
      console.log('\n✅ Contraseña actualizada correctamente para:');
      console.log('   ID:', result.rows[0].id_usuario);
      console.log('   Email:', result.rows[0].correo_usuario);
      console.log('   Nombre:', result.rows[0].nombre_usuario, result.rows[0].apellido_usuario);
      console.log('   Nueva contraseña:', plainPassword);
    } else {
      console.log('⚠️  No se encontró el usuario con id_usuario = 1');
    }
    
    await pool.end();
    console.log('\n✅ Proceso completado - Ahora puedes hacer login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();
