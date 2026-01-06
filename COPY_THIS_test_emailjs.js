/**
 * Script de prueba para EmailJS
 * Ejecutar: node test_emailjs.js
 */

require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testEmailJS() {
    console.log('\n========================================');
    console.log('🧪 Probando configuración de EmailJS');
    console.log('========================================\n');

    // Verificar variables de entorno
    console.log('📋 Verificando variables de entorno:');
    console.log('   EMAILJS_SERVICE_ID:', process.env.EMAILJS_SERVICE_ID ? '✅ Configurado' : '❌ No configurado');
    console.log('   EMAILJS_PUBLIC_KEY:', process.env.EMAILJS_PUBLIC_KEY ? '✅ Configurado' : '❌ No configurado');
    console.log('   EMAILJS_PRIVATE_KEY:', process.env.EMAILJS_PRIVATE_KEY ? '✅ Configurado' : '❌ No configurado');
    console.log('   EMAILJS_TEMPLATE_ID:', process.env.EMAILJS_TEMPLATE_ID ? '✅ Configurado' : '❌ No configurado');
    console.log('');

    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) {
        console.log('❌ Faltan variables de entorno. Agrega en tu archivo .env:');
        console.log('');
        console.log('   EMAILJS_SERVICE_ID=tu_service_id');
        console.log('   EMAILJS_PUBLIC_KEY=tu_public_key');
        console.log('   EMAILJS_PRIVATE_KEY=tu_private_key');
        console.log('   EMAILJS_TEMPLATE_ID=tu_template_id');
        console.log('');
        process.exit(1);
    }

    // Email de prueba (CAMBIA ESTO POR TU EMAIL)
    const testEmail = process.env.TEST_EMAIL || 'tu_email@gmail.com';
    const testName = 'Test User';

    console.log('📧 Enviando email de prueba a:', testEmail);
    console.log('');

    try {
        const result = await emailService.sendWelcomeEmail(testEmail, testName);
        
        console.log('✅ Email enviado exitosamente!');
        console.log('📊 Resultado:', JSON.stringify(result, null, 2));
        console.log('');
        console.log('🎉 EmailJS está configurado correctamente!');
        console.log('');
        console.log('Verifica tu bandeja de entrada en:', testEmail);
        console.log('(También revisa la carpeta de spam)');
        
    } catch (error) {
        console.error('❌ Error al enviar email:', error.message);
        console.error('');
        console.error('💡 Posibles soluciones:');
        console.error('   1. Verifica que las credenciales en .env sean correctas');
        console.error('   2. En EmailJS Dashboard → Account → API Keys');
        console.error('      Activa: "Allow API calls from non-browser applications"');
        console.error('   3. Verifica que el template exista en EmailJS Dashboard');
        console.error('');
        console.error('Detalles del error:', error);
        process.exit(1);
    }
}

// Ejecutar prueba
console.log('\n');
testEmailJS().then(() => {
    console.log('\n✅ Prueba completada\n');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Prueba falló:', error.message, '\n');
    process.exit(1);
});
