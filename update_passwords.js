/**
 * Script para actualizar contraseñas en texto plano a bcrypt hash
 * Ejecutar: node update_passwords.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
});

// Contraseñas por defecto para cada usuario
const usuarios = [
    { email: 'ana.garcia@email.com', password: 'ana123' },
    { email: 'bruno.solano@email.com', password: 'bruno123' },
    { email: 'carla.mendez@email.com', password: 'carla123' },
    { email: 'david.costas@email.com', password: 'david123' }
];

async function updatePasswords() {
    try {
        console.log('🔒 Actualizando contraseñas...\n');

        for (const user of usuarios) {
            // Generar hash
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Actualizar en BD
            await pool.query(
                'UPDATE usuario SET "contraseña_usuario" = $1 WHERE correo_usuario = $2',
                [hashedPassword, user.email]
            );
            
            console.log(`✅ ${user.email} - Contraseña actualizada`);
            console.log(`   Password: ${user.password}`);
            console.log(`   Hash: ${hashedPassword}\n`);
        }

        console.log('✅ Todas las contraseñas actualizadas con bcrypt hash');
        console.log('\n📋 Credenciales de acceso:');
        console.log('==========================================');
        usuarios.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`Password: ${u.password}`);
            console.log('------------------------------------------');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

updatePasswords();
