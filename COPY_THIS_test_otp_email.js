/**
 * Script de prueba para el email de OTP (código de verificación)
 * Ejecutar: node test_otp_email.js
 */

require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testOTPEmail() {
    console.log('\n========================================');
    console.log('🧪 Probando Email de Código OTP');
    console.log('========================================\n');

    // Datos de prueba (CAMBIA EL EMAIL)
    const testEmail = process.env.TEST_EMAIL || 'tu_email@gmail.com';
    const testName = 'Test User';
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generar OTP de 6 dígitos
    const expiryMinutes = 15;

    console.log('📧 Enviando código OTP a:', testEmail);
    console.log('🔐 Código OTP:', otpCode);
    console.log('⏰ Válido por:', expiryMinutes, 'minutos');
    console.log('');

    try {
        const result = await emailService.sendOTPEmail(
            testEmail,
            testName,
            otpCode,
            expiryMinutes
        );
        
        console.log('✅ Email OTP enviado exitosamente!');
        console.log('📊 Resultado:', JSON.stringify(result, null, 2));
        console.log('');
        console.log('🎉 El email OTP está funcionando correctamente!');
        console.log('');
        console.log('Verifica tu bandeja de entrada en:', testEmail);
        console.log('(También revisa la carpeta de spam)');
        console.log('');
        console.log('Código enviado:', otpCode);
        
    } catch (error) {
        console.error('❌ Error al enviar email OTP:', error.message);
        console.error('');
        console.error('Detalles del error:', error);
        process.exit(1);
    }
}

// Ejecutar prueba
console.log('\n');
testOTPEmail().then(() => {
    console.log('\n✅ Prueba de OTP completada\n');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Prueba de OTP falló:', error.message, '\n');
    process.exit(1);
});
