/**
 * Script de prueba para verificar la configuración de EmailJS
 * Ejecutar con: node test_emailjs.js
 */

require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testEmailJS() {
    console.log('========================================');
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
        console.error('❌ ERROR: Faltan variables de entorno de EmailJS');
        console.log('\nAgrega las siguientes variables a tu archivo .env:');
        console.log('   EMAILJS_SERVICE_ID=tu_service_id');
        console.log('   EMAILJS_PUBLIC_KEY=tu_public_key');
        console.log('   EMAILJS_PRIVATE_KEY=tu_private_key');
        console.log('   EMAILJS_TEMPLATE_ID=tu_template_id');
        process.exit(1);
    }

    // Email de prueba (cambiar por tu email real)
    const testEmail = process.env.TEST_EMAIL || 'jhon.velez.1042@gmail.com';
    const testName = 'Usuario de Prueba';

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
        console.error('Detalles del error:', error);
        console.error('');
        console.error('Posibles causas:');
        console.error('  1. Service ID incorrecto');
        console.error('  2. Public Key o Private Key incorrectos');
        console.error('  3. Template ID incorrecto');
        console.error('  4. El servicio de email no está conectado en EmailJS');
        console.error('  5. Problemas de conexión a internet');
        console.error('');
        console.error('Revisa la configuración en: https://dashboard.emailjs.com/');
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
