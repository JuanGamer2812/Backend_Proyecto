const nodemailer = require('nodemailer');

/**
 * Configuración de EmailJS
 * EmailJS se usa vía API REST desde el backend
 * Variables de entorno requeridas:
 * - EMAILJS_SERVICE_ID: ID del servicio de EmailJS
 * - EMAILJS_TEMPLATE_ID: ID del template base (opcional, se puede sobrescribir)
 * - EMAILJS_PUBLIC_KEY: Public key de EmailJS
 * - EMAILJS_PRIVATE_KEY: Private key de EmailJS (para backend)
 */
const emailjsConfig = {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
};

const emailjsEnabled = emailjsConfig.serviceId && emailjsConfig.publicKey && emailjsConfig.privateKey;

/**
 * Configuración del transportador de email (SMTP como fallback)
 * Usa las variables de entorno para configuración
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true para 465, false para otros puertos
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

/**
 * Envía un email usando EmailJS API REST
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.text - Texto plano
 * @param {string} options.html - HTML del email
 * @param {string} options.templateId - ID del template de EmailJS (opcional)
 * @returns {Promise} Info del envío
 */
const sendEmailWithEmailJS = async(options) => {
    try {
        const templateParams = {
            to_email: options.to,
            to_name: options.toName || options.to.split('@')[0],
            subject: options.subject,
            message: options.text || options.html?.replace(/<[^>]*>/g, ''), // Limpiar HTML para mensaje de texto
            html_content: options.html,
            from_name: 'ÉCLAT Eventos',
            reply_to: process.env.EMAIL_FROM || 'noreply@eclat.com'
        };

        // Usar template específico o el template por defecto
        const templateId = options.templateId || process.env.EMAILJS_TEMPLATE_ID || 'template_default';

        // Usar la API REST de EmailJS
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: emailjsConfig.serviceId,
                template_id: templateId,
                user_id: emailjsConfig.publicKey,
                accessToken: emailjsConfig.privateKey,
                template_params: templateParams
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
        }

        const result = await response.text();
        console.log('[EmailJS] Email enviado exitosamente:', result);
        
        return {
            success: true,
            messageId: result,
            provider: 'emailjs',
            response: result
        };
    } catch (error) {
        console.error('[EmailJS] Error al enviar email:', error.message);
        throw error;
    }
};

/**
 * Envía un email usando SMTP (nodemailer) como fallback
 * @param {Object} options - Opciones del email
 * @returns {Promise} Info del envío
 */
const sendEmailWithSMTP = async(options) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"ÉCLAT Eventos" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP] Email enviado:', info.messageId);
    return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        response: info.response
    };
};

/**
 * Envía un email (prioriza EmailJS, fallback a SMTP)
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.text - Texto plano
 * @param {string} options.html - HTML del email
 * @param {string} options.toName - Nombre del destinatario (opcional)
 * @param {string} options.templateId - ID del template de EmailJS (opcional)
 * @returns {Promise} Info del envío
 */
const sendEmail = async(options) => {
    try {
        // Intentar con EmailJS primero
        if (emailjsEnabled) {
            console.log('[email.service] Usando EmailJS para enviar email a:', options.to);
            return await sendEmailWithEmailJS(options);
        } else {
            console.log('[email.service] EmailJS no configurado, usando SMTP');
            return await sendEmailWithSMTP(options);
        }
    } catch (error) {
        console.error('[email.service] Error al enviar email con proveedor principal:', error.message);
        
        // Si EmailJS falla, intentar con SMTP
        if (emailjsEnabled) {
            console.log('[email.service] Intentando con SMTP como fallback...');
            try {
                return await sendEmailWithSMTP(options);
            } catch (smtpError) {
                console.error('[email.service] Fallback SMTP también falló:', smtpError.message);
                throw smtpError;
            }
        }
        throw error;
    }
};

/**
 * Email de bienvenida al registrarse
 */
const sendWelcomeEmail = async(userEmail, userName) => {
    const subject = '¡Bienvenido a ÉCLAT Eventos! 🎉';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Bienvenido a ÉCLAT Eventos!</h1>
                </div>
                <div class="content">
                    <h2>Hola ${userName},</h2>
                    <p>¡Gracias por registrarte en ÉCLAT Eventos! Estamos emocionados de tenerte con nosotros.</p>
                    <p>Con ÉCLAT puedes:</p>
                    <ul>
                        <li>✨ Crear y gestionar tus eventos</li>
                        <li>🎵 Contratar servicios de música, catering, decoración y más</li>
                        <li>📧 Enviar invitaciones personalizadas</li>
                        <li>📊 Hacer seguimiento de confirmaciones</li>
                        <li>💳 Procesar pagos de forma segura</li>
                    </ul>
                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}" class="button">
                            Explorar Eventos
                        </a>
                    </p>
                    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p>¡Que disfrutes creando eventos inolvidables!</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>
                <div class="footer">
                    <p>ÉCLAT Eventos - Tu mejor aliado para eventos perfectos</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Hola ${userName},
        
        ¡Gracias por registrarte en ÉCLAT Eventos! Estamos emocionados de tenerte con nosotros.
        
        Con ÉCLAT puedes crear y gestionar tus eventos, contratar servicios, enviar invitaciones y mucho más.
        
        Visita ${process.env.FRONTEND_URL || 'http://localhost:4200'} para comenzar.
        
        ¡El equipo de ÉCLAT!
    `;

    return await sendEmail({ 
        to: userEmail, 
        toName: userName,
        subject, 
        text, 
        html,
        templateId: process.env.EMAILJS_WELCOME_TEMPLATE || process.env.EMAILJS_TEMPLATE_ID
    });
};

/**
 * Email de recuperación de contraseña
 */
const sendPasswordResetEmail = async(userEmail, userName, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/recuperar-cuenta?token=${resetToken}`;
    const subject = 'Recuperación de Contraseña - ÉCLAT Eventos';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Recuperación de Contraseña</h1>
                </div>
                <div class="content">
                    <h2>Hola ${userName},</h2>
                    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                    </p>
                    <p><small>O copia y pega este enlace en tu navegador:<br>${resetUrl}</small></p>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong>
                        <ul>
                            <li>Este enlace expira en 1 hora</li>
                            <li>Si no solicitaste este cambio, ignora este email</li>
                            <li>Nunca compartas este enlace con nadie</li>
                        </ul>
                    </div>
                    <p>Saludos,<br><strong>El equipo de ÉCLAT</strong></p>
                </div>
                <div class="footer">
                    <p>ÉCLAT Eventos - Seguridad y Confianza</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Hola ${userName},
        
        Recibimos una solicitud para restablecer tu contraseña.
        
        Haz clic en el siguiente enlace para crear una nueva contraseña:
        ${resetUrl}
        
        Este enlace expira en 1 hora.
        
        Si no solicitaste este cambio, ignora este email.
        
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: userEmail, toName: userName, subject, text, html });
};

/**
 * Envía un email con código OTP para verificación de cuenta
 * @param {string} userEmail - Email del usuario
 * @param {string} userName - Nombre del usuario
 * @param {string} otpCode - Código OTP (6 dígitos)
 * @param {number} expiryMinutes - Minutos de validez del código (default: 15)
 * @returns {Promise<Object>} Resultado del envío
 */
const sendOTPEmail = async (userEmail, userName, otpCode, expiryMinutes = 15) => {
    const subject = '🔐 Tu Código de Verificación - ÉCLAT Eventos';
    
    // Calcular tiempo de expiración
    const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiryTimeString = expiryTime.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    const currentYear = new Date().getFullYear();

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .icon {
                    font-size: 50px;
                    margin-bottom: 10px;
                }
                .content {
                    padding: 40px 30px;
                }
                .greeting {
                    font-size: 18px;
                    color: #333;
                    margin-bottom: 20px;
                }
                .message {
                    color: #555;
                    font-size: 15px;
                    margin-bottom: 30px;
                }
                .otp-container {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    margin: 30px 0;
                    box-shadow: 0 4px 15px rgba(245, 87, 108, 0.2);
                }
                .otp-label {
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                }
                .otp-code {
                    font-size: 42px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
                    margin: 10px 0;
                }
                .otp-validity {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 13px;
                    margin-top: 15px;
                }
                .info-box {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 5px;
                }
                .info-box strong {
                    color: #856404;
                    font-size: 15px;
                }
                .info-box ul {
                    margin: 10px 0 0 0;
                    padding-left: 20px;
                }
                .info-box li {
                    color: #856404;
                    margin: 8px 0;
                    font-size: 14px;
                }
                .security-notice {
                    background: #f8d7da;
                    border-left: 4px solid #dc3545;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 5px;
                }
                .security-notice strong {
                    color: #721c24;
                    font-size: 15px;
                    display: block;
                    margin-bottom: 10px;
                }
                .security-notice p {
                    color: #721c24;
                    margin: 5px 0;
                    font-size: 14px;
                }
                .footer {
                    background: #333;
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .footer p {
                    margin: 5px 0;
                    font-size: 13px;
                    opacity: 0.8;
                }
                .footer .brand {
                    font-size: 18px;
                    font-weight: 600;
                    opacity: 1;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">🔐</div>
                    <h1>Código de Verificación</h1>
                    <p>ÉCLAT Eventos</p>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Hola <strong>${userName}</strong>,
                    </div>
                    
                    <div class="message">
                        Para autenticar tu cuenta y completar el proceso de verificación, utiliza el siguiente código de un solo uso (OTP):
                    </div>
                    
                    <div class="otp-container">
                        <div class="otp-label">Tu Código de Verificación</div>
                        <div class="otp-code">${otpCode}</div>
                        <div class="otp-validity">⏰ Este código expirará en <strong>${expiryMinutes} minutos</strong></div>
                    </div>
                    
                    <div class="info-box">
                        <strong>📋 Instrucciones:</strong>
                        <ul>
                            <li>Ingresa este código en la pantalla de verificación</li>
                            <li>El código es válido hasta las <strong>${expiryTimeString}</strong></li>
                            <li>No compartas este código con nadie</li>
                        </ul>
                    </div>
                    
                    <div class="security-notice">
                        <strong>🛡️ Aviso de Seguridad</strong>
                        <p>• ÉCLAT nunca te pedirá este código por teléfono, email o mensaje</p>
                        <p>• Si no solicitaste este código, ignora este email de forma segura</p>
                        <p>• Ten cuidado con intentos de phishing y estafas</p>
                    </div>
                    
                    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                        ¿No solicitaste este código? Puedes ignorar este email de forma segura.<br>
                        Tu cuenta permanece protegida.
                    </p>
                </div>
                
                <div class="footer">
                    <p class="brand">ÉCLAT Eventos</p>
                    <p>Creando momentos inolvidables</p>
                    <p style="margin-top: 15px; opacity: 0.6;">
                        Este es un email automático, por favor no respondas a este mensaje.
                    </p>
                    <p>© ${currentYear} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Código de Verificación - ÉCLAT Eventos

Hola ${userName},

Para autenticar tu cuenta, utiliza el siguiente código de un solo uso (OTP):

CÓDIGO: ${otpCode}

⏰ Este código expirará en ${expiryMinutes} minutos (hasta las ${expiryTimeString})

INSTRUCCIONES:
- Ingresa este código en la pantalla de verificación
- No compartas este código con nadie

SEGURIDAD:
- ÉCLAT nunca te pedirá este código por teléfono, email o mensaje
- Si no solicitaste este código, ignora este email
- Tu cuenta permanece protegida

El equipo de ÉCLAT
    `;

    return await sendEmail({ 
        to: userEmail,
        toName: userName,
        subject, 
        text, 
        html,
        templateId: process.env.EMAILJS_OTP_TEMPLATE || process.env.EMAILJS_TEMPLATE_ID
    });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOTPEmail
};
