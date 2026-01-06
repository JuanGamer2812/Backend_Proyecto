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
        // Priorizar EmailJS si está configurado
        if (emailjsEnabled) {
            console.log('[email.service] Usando EmailJS para enviar email a:', options.to);
            return await sendEmailWithEmailJS(options);
        }

        // Fallback a SMTP si EmailJS no está configurado
        console.log('[email.service] EmailJS no configurado, usando SMTP para enviar email a:', options.to);
        return await sendEmailWithSMTP(options);
    } catch (error) {
        console.error('[email.service] Error al enviar email:', error);
        
        // Si EmailJS falla, intentar con SMTP como último recurso
        if (emailjsEnabled && error.message?.includes('EmailJS')) {
            console.warn('[email.service] EmailJS falló, intentando con SMTP...');
            try {
                return await sendEmailWithSMTP(options);
            } catch (smtpError) {
                console.error('[email.service] SMTP también falló:', smtpError);
                throw new Error(`Error al enviar email: ${error.message}`);
            }
        }
        
        throw new Error(`Error al enviar email: ${error.message}`);
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

    return await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Email de confirmación de evento
 */
const sendEventConfirmationEmail = async(userEmail, userName, eventoData) => {
    const subject = `✅ Confirmación de Evento: ${eventoData.nombre_evento}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ ¡Evento Confirmado!</h1>
                </div>
                <div class="content">
                    <h2>Hola ${userName},</h2>
                    <p>Tu evento ha sido creado exitosamente. Aquí están los detalles:</p>
                    <div class="event-details">
                        <h3>${eventoData.nombre_evento}</h3>
                        <div class="detail-row">
                            <strong>Tipo:</strong>
                            <span>${eventoData.tipo_evento}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Fecha Inicio:</strong>
                            <span>${new Date(eventoData.fecha_inicio).toLocaleString('es-ES')}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Fecha Fin:</strong>
                            <span>${new Date(eventoData.fecha_fin).toLocaleString('es-ES')}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Precio Base:</strong>
                            <span>$${eventoData.precio_evento}</span>
                        </div>
                    </div>
                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/evento" class="button">Ver Mi Evento</a>
                    </p>
                    <p>Próximos pasos:</p>
                    <ul>
                        <li>📋 Agrega invitados a tu evento</li>
                        <li>✉️ Envía invitaciones personalizadas</li>
                        <li>📊 Haz seguimiento de confirmaciones</li>
                    </ul>
                    <p>¡Gracias por confiar en ÉCLAT!</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>
                <div class="footer">
                    <p>ÉCLAT Eventos - Hacemos tus eventos realidad</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Hola ${userName},
        
        Tu evento "${eventoData.nombre_evento}" ha sido creado exitosamente.
        
        Detalles:
        - Tipo: ${eventoData.tipo_evento}
        - Inicio: ${new Date(eventoData.fecha_inicio).toLocaleString('es-ES')}
        - Fin: ${new Date(eventoData.fecha_fin).toLocaleString('es-ES')}
        - Precio: $${eventoData.precio_evento}
        
        Visita ${process.env.FRONTEND_URL}/evento para gestionar tu evento.
        
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Email de invitación a evento
 */
const sendEventInvitationEmail = async(invitadoEmail, invitadoNombre, eventoData, codigoInvitacion) => {
        const rsvpUrl = `${process.env.FRONTEND_URL}/invitacion/${codigoInvitacion}`;
        const subject = `🎉 Invitación: ${eventoData.nombre_evento}`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .invitation-card { background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                .button { display: inline-block; padding: 15px 40px; background: #FF69B4; color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-size: 16px; font-weight: bold; }
                .event-info { background: #fff; padding: 20px; border-left: 4px solid #FF69B4; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 ¡Estás Invitado!</h1>
                </div>
                <div class="content">
                    <div class="invitation-card">
                        <h2>Querido/a ${invitadoNombre},</h2>
                        <p style="font-size: 18px;">Tienes el honor de estar invitado/a a:</p>
                        <h1 style="color: #FF69B4; margin: 20px 0;">${eventoData.nombre_evento}</h1>
                    </div>
                    <div class="event-info">
                        <p><strong>📅 Fecha:</strong> ${new Date(eventoData.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>🕐 Hora:</strong> ${new Date(eventoData.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        ${eventoData.lugar ? `<p><strong>📍 Lugar:</strong> ${eventoData.lugar}</p>` : ''}
                        ${eventoData.descripcion ? `<p><strong>📝 Detalles:</strong> ${eventoData.descripcion}</p>` : ''}
                    </div>
                    <p style="text-align: center; font-size: 16px;">
                        <strong>Por favor, confirma tu asistencia:</strong>
                    </p>
                    <p style="text-align: center;">
                        <a href="${rsvpUrl}" class="button">Confirmar Asistencia (RSVP)</a>
                    </p>
                    <p style="text-align: center; font-size: 12px; color: #666;">
                        ¡Esperamos verte allí!
                    </p>
                </div>
                <div class="footer">
                    <p>Invitación enviada por ÉCLAT Eventos</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Haciendo tus eventos inolvidables.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        ¡Estás Invitado!
        
        Querido/a ${invitadoNombre},
        
        Tienes el honor de estar invitado/a a: ${eventoData.nombre_evento}
        
        Fecha: ${new Date(eventoData.fecha_inicio).toLocaleString('es-ES')}
        ${eventoData.lugar ? `Lugar: ${eventoData.lugar}` : ''}
        
        Por favor confirma tu asistencia en: ${rsvpUrl}
        
        ¡Esperamos verte allí!
    `;

    return await sendEmail({ to: invitadoEmail, subject, text, html });
};

/**
 * Email de confirmación de pago
 */
const sendPaymentConfirmationEmail = async (userEmail, userName, pagoData) => {
    const subject = `💳 Pago Confirmado - Orden #${pagoData.id_pago}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .payment-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .total { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; font-size: 24px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Pago Confirmado</h1>
                </div>
                <div class="content">
                    <h2>Hola ${userName},</h2>
                    <p>¡Tu pago ha sido procesado exitosamente!</p>
                    <div class="payment-details">
                        <p><strong>Número de Orden:</strong> #${pagoData.id_pago}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                        <p><strong>Método de Pago:</strong> ${pagoData.metodo_pago}</p>
                        <p><strong>Estado:</strong> ✅ Completado</p>
                    </div>
                    <div class="total">
                        <p style="margin: 0;">Total Pagado</p>
                        <h2 style="margin: 10px 0;">$${pagoData.monto.toFixed(2)}</h2>
                    </div>
                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/factura/${pagoData.id_pago}" class="button">Descargar Recibo</a>
                    </p>
                    <p>Gracias por tu preferencia.</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>
                <div class="footer">
                    <p>ÉCLAT Eventos - Pagos Seguros</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Pago Confirmado
        
        Hola ${userName},
        
        Tu pago ha sido procesado exitosamente.
        
        Número de Orden: #${pagoData.id_pago}
        Total Pagado: $${pagoData.monto.toFixed(2)}
        Método: ${pagoData.metodo_pago}
        
        Descarga tu recibo en: ${process.env.FRONTEND_URL}/factura/${pagoData.id_pago}
        
        Gracias por tu preferencia.
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Email de invitación a evento
 */
const sendInvitationEmail = async (invitacionData) => {
    const subject = `Estás invitado a ${invitacionData.nombre_evento} 🎉`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .event-details { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea; }
                .event-details p { margin: 10px 0; }
                .event-details strong { color: #667eea; display: inline-block; width: 120px; }
                .rsvp-section { background: #fff; padding: 30px; text-align: center; border: 2px dashed #667eea; border-radius: 8px; margin: 30px 0; }
                .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 50px; margin: 10px; font-weight: bold; transition: all 0.3s; }
                .button:hover { background: #764ba2; }
                .button-decline { background: #6c757d; }
                .button-decline:hover { background: #5a6268; }
                .message-box { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
                .footer { background: #333; color: white; padding: 25px; text-align: center; font-size: 12px; }
                .code-box { background: #fff3cd; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; border: 2px dashed #ffc107; }
                .code-box code { font-size: 24px; font-weight: bold; color: #ff6b6b; letter-spacing: 2px; }
                .icon { font-size: 50px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">🎊</div>
                    <h1>¡Estás Invitado!</h1>
                    <p style="font-size: 18px; margin: 10px 0 0 0;">${invitacionData.nombre_evento}</p>
                </div>
                
                <div class="content">
                    <h2 style="color: #667eea;">Hola ${invitacionData.nombre_invitado},</h2>
                    <p style="font-size: 16px; margin: 20px 0;">
                        Nos complace invitarte a nuestro evento especial. Será un placer contar con tu presencia.
                    </p>

                    ${invitacionData.mensaje_personalizado ? `
                    <div class="message-box">
                        <strong style="color: #2196F3;">📝 Mensaje especial para ti:</strong>
                        <p style="margin: 10px 0 0 0; font-style: italic;">${invitacionData.mensaje_personalizado}</p>
                    </div>
                    ` : ''}

                    <div class="event-details">
                        <h3 style="margin-top: 0; color: #667eea;">📅 Detalles del Evento</h3>
                        <p><strong>📍 Lugar:</strong> ${invitacionData.ubicacion}</p>
                        <p><strong>🕐 Fecha:</strong> ${invitacionData.fecha_evento}</p>
                        ${invitacionData.descripcion ? `<p><strong>📋 Acerca:</strong> ${invitacionData.descripcion}</p>` : ''}
                        ${invitacionData.numero_acompanantes > 0 ? `
                        <p><strong>👥 Acompañantes:</strong> Puedes traer hasta ${invitacionData.numero_acompanantes} acompañante${invitacionData.numero_acompanantes > 1 ? 's' : ''}</p>
                        ` : ''}
                    </div>

                    <div class="rsvp-section">
                        <h3 style="margin-top: 0; color: #667eea;">🎯 Confirma tu Asistencia</h3>
                        <p style="margin-bottom: 25px;">Por favor confirma si asistirás al evento haciendo clic en el botón correspondiente:</p>
                        
                        <a href="${invitacionData.rsvp_url}" class="button">
                            ✓ Sí, Asistiré
                        </a>
                        <a href="${invitacionData.rsvp_url}" class="button button-decline">
                            ✗ No Podré Asistir
                        </a>

                        <div class="code-box">
                            <p style="margin: 0; font-size: 14px; color: #666;">Código de invitación:</p>
                            <code>${invitacionData.codigo_invitacion}</code>
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 15px;">
                            También puedes usar este código en nuestro sitio web
                        </p>
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                        <p style="margin: 0; font-size: 14px; text-align: center;">
                            <strong>Organizador:</strong> ${invitacionData.organizador_nombre}<br>
                            <a href="mailto:${invitacionData.organizador_email}" style="color: #667eea; text-decoration: none;">
                                ${invitacionData.organizador_email}
                            </a>
                        </p>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 10px 0;">ÉCLAT Eventos - Creando Momentos Inolvidables</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        ¡Estás Invitado a ${invitacionData.nombre_evento}!
        
        Hola ${invitacionData.nombre_invitado},
        
        Nos complace invitarte a nuestro evento especial.
        
        DETALLES DEL EVENTO:
        📍 Lugar: ${invitacionData.ubicacion}
        🕐 Fecha: ${invitacionData.fecha_evento}
        ${invitacionData.numero_acompanantes > 0 ? `👥 Acompañantes permitidos: ${invitacionData.numero_acompanantes}` : ''}
        
        ${invitacionData.mensaje_personalizado ? `
        Mensaje especial:
        ${invitacionData.mensaje_personalizado}
        ` : ''}
        
        CONFIRMA TU ASISTENCIA:
        Visita: ${invitacionData.rsvp_url}
        Código de invitación: ${invitacionData.codigo_invitacion}
        
        Organizador: ${invitacionData.organizador_nombre}
        Contacto: ${invitacionData.organizador_email}
        
        ¡Esperamos verte pronto!
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: invitacionData.email, subject, text, html });
};

/**
 * Email de confirmación de asistencia (RSVP Confirmado)
 */
const sendRSVPConfirmationEmail = async (confirmacionData) => {
    const subject = `Confirmación de Asistencia - ${confirmacionData.nombre_evento}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 30px; text-align: center; }
                .content { padding: 40px 30px; }
                .confirmation-box { background: #d4edda; padding: 25px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0; }
                .details-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .footer { background: #333; color: white; padding: 25px; text-align: center; font-size: 12px; }
                .icon { font-size: 60px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">✅</div>
                    <h1>¡Asistencia Confirmada!</h1>
                </div>
                
                <div class="content">
                    <h2 style="color: #28a745;">Hola ${confirmacionData.nombre_invitado},</h2>
                    <p style="font-size: 16px;">
                        ¡Gracias por confirmar tu asistencia! Estamos emocionados de que nos acompañes.
                    </p>

                    <div class="confirmation-box">
                        <h3 style="margin-top: 0; color: #28a745;">📋 Resumen de tu Confirmación</h3>
                        <p><strong>Evento:</strong> ${confirmacionData.nombre_evento}</p>
                        <p><strong>Fecha:</strong> ${confirmacionData.fecha_evento}</p>
                        <p><strong>Lugar:</strong> ${confirmacionData.ubicacion}</p>
                        <p><strong>Asistentes:</strong> ${1 + confirmacionData.acompanantes_confirmados} persona${(1 + confirmacionData.acompanantes_confirmados) > 1 ? 's' : ''}</p>
                        ${confirmacionData.restricciones_alimentarias ? `
                        <p><strong>Restricciones Alimentarias:</strong> ${confirmacionData.restricciones_alimentarias}</p>
                        ` : ''}
                    </div>

                    <div class="details-box">
                        <p style="margin: 0; text-align: center;">
                            <strong>💡 Tip:</strong> Guarda este email como recordatorio del evento
                        </p>
                    </div>

                    <p style="margin-top: 30px;">
                        Si necesitas hacer algún cambio, por favor contacta al organizador.
                    </p>
                    <p>¡Nos vemos pronto!</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 10px 0;">ÉCLAT Eventos - Creando Momentos Inolvidables</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        ¡Asistencia Confirmada!
        
        Hola ${confirmacionData.nombre_invitado},
        
        Gracias por confirmar tu asistencia a ${confirmacionData.nombre_evento}.
        
        RESUMEN:
        📅 Evento: ${confirmacionData.nombre_evento}
        📍 Lugar: ${confirmacionData.ubicacion}
        🕐 Fecha: ${confirmacionData.fecha_evento}
        👥 Asistentes: ${1 + confirmacionData.acompanantes_confirmados}
        ${confirmacionData.restricciones_alimentarias ? `🍽️ Restricciones: ${confirmacionData.restricciones_alimentarias}` : ''}
        
        ¡Nos vemos pronto!
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: confirmacionData.email, subject, text, html });
};

/**
 * Email de respuesta negativa (RSVP Rechazado)
 */
const sendRSVPDeclinedEmail = async (declinacionData) => {
    const subject = `Respuesta Recibida - ${declinacionData.nombre_evento}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 40px 30px; text-align: center; }
                .content { padding: 40px 30px; }
                .footer { background: #333; color: white; padding: 25px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Respuesta Recibida</h1>
                </div>
                
                <div class="content">
                    <h2>Hola ${declinacionData.nombre_invitado},</h2>
                    <p>Gracias por responder a nuestra invitación para ${declinacionData.nombre_evento}.</p>
                    <p>Lamentamos que no puedas acompañarnos en esta ocasión. ¡Esperamos verte en futuros eventos!</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>

                <div class="footer">
                    <p style="margin: 0;">© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Respuesta Recibida
        
        Hola ${declinacionData.nombre_invitado},
        
        Gracias por responder a nuestra invitación para ${declinacionData.nombre_evento}.
        Lamentamos que no puedas acompañarnos.
        
        ¡Esperamos verte en futuros eventos!
        
        El equipo de ÉCLAT
    `;

    return await sendEmail({ to: declinacionData.email, subject, text, html });
};

/**
 * Envía un email de verificación de cuenta
 * @param {string} userEmail - Email del usuario
 * @param {string} userName - Nombre del usuario
 * @param {string} verificationToken - Token de verificación
 * @returns {Promise<Object>} Resultado del envío
 */
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/verificar-cuenta?token=${verificationToken}`;
    const subject = 'Verifica tu correo - ÉCLAT';

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
                    <h1>Verifica tu correo</h1>
                </div>
                <div class="content">
                    <h2>Hola ${userName || 'usuario'},</h2>
                    <p>Gracias por registrarte en ÉCLAT. Por favor confirma tu correo para activar tu cuenta.</p>
                    <p style="text-align: center;">
                        <a href="${verifyUrl}" class="button">Verificar correo</a>
                    </p>
                    <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="word-break: break-all;">${verifyUrl}</p>
                    <p>Si no solicitaste esta verificación, puedes ignorar este mensaje.</p>
                    <p><strong>El equipo de ÉCLAT</strong></p>
                </div>
                <div class="footer">
                    <p>ÉCLAT Eventos - Seguridad de cuenta</p>
                    <p>© ${new Date().getFullYear()} ÉCLAT. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Hola ${userName || 'usuario'},

        Gracias por registrarte en ÉCLAT. Confirma tu correo para activar tu cuenta.

        Enlace de verificación: ${verifyUrl}

        Si no solicitaste esta verificación, ignora este mensaje.

        El equipo de ÉCLAT
    `;

    return await sendEmail({ 
        to: userEmail,
        toName: userName,
        subject, 
        text, 
        html,
        templateId: process.env.EMAILJS_VERIFICATION_TEMPLATE || process.env.EMAILJS_TEMPLATE_ID
    });
};

// Alias para mantener compatibilidad con código existente
const sendVerificationEmailWithResend = sendVerificationEmail;

/**
 * Envía un email con una contraseña temporal para recuperación de cuenta
 * @param {string} userEmail - Email del usuario
 * @param {string} userName - Nombre del usuario
 * @param {string} temporaryPassword - Contraseña temporal generada
 * @returns {Promise<Object>} Resultado del envío
 */
const sendTemporaryPasswordEmail = async (userEmail, userName, temporaryPassword) => {
    const subject = '🔐 Tu Contraseña Temporal - ÉCLAT Eventos';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .password-box { background: #fff; border: 2px solid #f44336; border-radius: 10px; padding: 20px; margin: 25px 0; text-align: center; }
                .password { font-size: 32px; font-weight: bold; color: #f44336; letter-spacing: 2px; background: #ffe5e5; padding: 15px 25px; border-radius: 5px; display: inline-block; margin: 10px 0; font-family: 'Courier New', monospace; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .warning strong { color: #856404; }
                .steps { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .steps ol { margin: 10px 0; padding-left: 25px; }
                .steps li { margin: 8px 0; }
                .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
                .security-notice { background: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #ef9a9a; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Contraseña Temporal</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Recuperación de Cuenta</p>
                </div>
                <div class="content">
                    <h2>Hola ${userName},</h2>
                    <p>Recibimos una solicitud para restablecer tu contraseña en ÉCLAT Eventos.</p>
                    <p><strong>Hemos generado una contraseña temporal para ti:</strong></p>
                    
                    <div class="password-box">
                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Tu contraseña temporal es:</p>
                        <div class="password">${temporaryPassword}</div>
                        <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Copia esta contraseña exactamente como aparece</p>
                    </div>

                    <div class="warning">
                        <strong>⏰ Importante:</strong> Esta contraseña temporal expira en <strong>1 hora</strong>
                    </div>

                    <div class="steps">
                        <h3 style="margin-top: 0; color: #1976d2;">📝 Pasos para acceder:</h3>
                        <ol>
                            <li>Ve a la página de inicio de sesión</li>
                            <li>Ingresa tu email: <strong>${userEmail}</strong></li>
                            <li>Usa la contraseña temporal mostrada arriba</li>
                            <li>Serás redirigido para crear una nueva contraseña</li>
                            <li>Ingresa tu nueva contraseña permanente</li>
                        </ol>
                    </div>

                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/login" class="button">
                            Ir a Iniciar Sesión
                        </a>
                    </p>

                    <div class="security-notice">
                        <strong>🔒 Seguridad:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>No compartas esta contraseña con nadie</li>
                            <li>Cambia tu contraseña inmediatamente después de iniciar sesión</li>
                            <li>Si no solicitaste este cambio, contacta a soporte de inmediato</li>
                        </ul>
                    </div>

                    <p><strong>¿No solicitaste este cambio?</strong></p>
                    <p>Si no solicitaste restablecer tu contraseña, ignora este email. Tu cuenta permanece segura y esta contraseña temporal expirará automáticamente.</p>
                    
                    <p style="margin-top: 30px;"><strong>El equipo de ÉCLAT</strong></p>
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
Contraseña Temporal - ÉCLAT Eventos

Hola ${userName},

Hemos generado una contraseña temporal para ti:

CONTRASEÑA TEMPORAL: ${temporaryPassword}

⏰ IMPORTANTE: Esta contraseña expira en 1 hora

PASOS PARA ACCEDER:
1. Ve a ${process.env.FRONTEND_URL || 'http://localhost:4200'}/login
2. Ingresa tu email: ${userEmail}
3. Usa la contraseña temporal
4. Crea una nueva contraseña permanente

SEGURIDAD:
- No compartas esta contraseña
- Cambia tu contraseña inmediatamente
- Si no solicitaste este cambio, contacta a soporte

El equipo de ÉCLAT
    `;

    return await sendEmail({ 
        to: userEmail,
        toName: userName,
        subject, 
        text, 
        html,
        templateId: process.env.EMAILJS_PASSWORD_TEMPLATE || process.env.EMAILJS_TEMPLATE_ID
    });
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
    sendEventConfirmationEmail,
    sendEventInvitationEmail,
    sendPaymentConfirmationEmail,
    sendInvitationEmail,
    sendRSVPConfirmationEmail,
    sendRSVPDeclinedEmail,
    sendVerificationEmail,
    sendVerificationEmailWithResend, // Alias para compatibilidad
    sendTemporaryPasswordEmail,
    sendOTPEmail
};