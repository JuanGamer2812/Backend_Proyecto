# Configuración de EmailJS para ÉCLAT Eventos

Este proyecto utiliza **EmailJS** para el envío de correos electrónicos. EmailJS es un servicio que permite enviar emails directamente desde JavaScript sin necesidad de un servidor backend tradicional de email.

## 📋 Requisitos Previos

1. Cuenta en [EmailJS](https://www.emailjs.com/)
2. Servicio de email configurado (Gmail, Outlook, etc.)
3. Templates creados en EmailJS

## 🚀 Pasos de Configuración

### 1. Crear Cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Regístrate o inicia sesión
3. Verifica tu email

### 2. Configurar Servicio de Email

1. En el dashboard de EmailJS, ve a **Email Services**
2. Click en **Add New Service**
3. Selecciona tu proveedor de email (Gmail, Outlook, etc.)
4. Configura las credenciales:
   - Para **Gmail**: 
     - Email: tu_email@gmail.com
     - Activa "Aplicaciones menos seguras" o genera una "Contraseña de aplicación"
   - Para **Outlook/Hotmail**:
     - Email: tu_email@outlook.com
     - Usa tu contraseña normal
5. Copia el **Service ID** (ej: `service_abc123`)

### 3. Crear Templates

EmailJS usa templates para los emails. Necesitas crear los siguientes templates:

#### Template de Bienvenida
1. Ve a **Email Templates** → **Create New Template**
2. Nombre: `Bienvenida ÉCLAT`
3. Subject: `¡Bienvenido a ÉCLAT Eventos! 🎉`
4. Content (HTML):
```html
<div style="font-family: Arial, sans-serif;">
  <h2>Hola {{to_name}},</h2>
  <p>{{message}}</p>
  <div>{{{html_content}}}</div>
  <p>Saludos,<br>{{from_name}}</p>
</div>
```
5. Copia el **Template ID** (ej: `template_xyz789`)

#### Template de Contraseña Temporal
1. Crear otro template similar
2. Subject: `🔐 Tu Contraseña Temporal - ÉCLAT Eventos`
3. Copia el **Template ID**

#### Template de Verificación
1. Crear otro template
2. Subject: `Verifica tu correo - ÉCLAT`
3. Copia el **Template ID**

### 4. Obtener API Keys

1. Ve a **Account** → **General**
2. Copia tu **Public Key** (ej: `pk_abc123xyz`)
3. Copia tu **Private Key** (ej: `sk_def456uvw`)
   - Si no tienes Private Key, genérala desde **API Keys**

## 🔧 Configuración en el Proyecto

### Variables de Entorno

Agrega las siguientes variables en tu archivo `.env`:

```bash
# EmailJS Configuration
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_PUBLIC_KEY=pk_abc123xyz
EMAILJS_PRIVATE_KEY=sk_def456uvw

# Template IDs (opcional - usar templates específicos)
EMAILJS_TEMPLATE_ID=template_xyz789          # Template por defecto
EMAILJS_WELCOME_TEMPLATE=template_welcome123  # Template de bienvenida
EMAILJS_PASSWORD_TEMPLATE=template_pass456    # Template de contraseña
EMAILJS_VERIFICATION_TEMPLATE=template_ver789 # Template de verificación

# Email de remitente (aparecerá como "De:")
EMAIL_FROM=noreply@eclat.com
```

### Configuración en Railway (Producción)

1. Ve a tu proyecto en Railway
2. Ve a **Variables**
3. Agrega las mismas variables de entorno:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_PRIVATE_KEY`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAIL_FROM`

## 📧 Tipos de Emails Soportados

El sistema envía los siguientes tipos de emails:

1. **Email de Bienvenida** - Al registrarse
2. **Recuperación de Contraseña** - Contraseña temporal
3. **Verificación de Email** - Confirmar cuenta
4. **Confirmación de Evento** - Evento creado
5. **Invitación a Evento** - Invitar asistentes
6. **Confirmación de Pago** - Pago procesado
7. **RSVP Confirmado** - Asistencia confirmada
8. **RSVP Rechazado** - No asistirá

## 🔄 Fallback a SMTP

Si EmailJS no está configurado o falla, el sistema automáticamente usará **SMTP** (nodemailer) como respaldo.

Para configurar SMTP, agrega estas variables:

```bash
# SMTP Configuration (Fallback)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
```

## ✅ Verificar Configuración

Para verificar que EmailJS está funcionando:

1. Inicia el backend: `npm start`
2. Registra un nuevo usuario desde el frontend
3. Verifica que recibas el email de bienvenida
4. Revisa los logs del backend:
   ```
   [email.service] Usando EmailJS para enviar email a: usuario@ejemplo.com
   [EmailJS] Email enviado exitosamente: OK
   ```

## 🐛 Troubleshooting

### Error: "EmailJS not configured"
- **Solución**: Verifica que las 3 variables estén configuradas: `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`

### Error: "Template not found"
- **Solución**: Verifica el Template ID en EmailJS dashboard y en las variables de entorno

### Error: "Service not allowed"
- **Solución**: Verifica que el Service ID sea correcto y que el servicio esté activo en EmailJS

### Emails no llegan
- Verifica la bandeja de spam
- Verifica que el servicio de email esté conectado correctamente en EmailJS
- Revisa los logs de EmailJS dashboard en **Activity Log**

### Fallback a SMTP se activa
- Si ves `[email.service] EmailJS no configurado, usando SMTP`, significa que EmailJS no está configurado
- Verifica las variables de entorno

## 📊 Límites de EmailJS

- **Plan Gratuito**: 200 emails/mes
- **Plan Personal**: 1,000 emails/mes ($15/mes)
- **Plan Pro**: 10,000 emails/mes ($45/mes)

Para más emails, considera actualizar tu plan o usar SMTP directamente.

## 📚 Recursos

- [Documentación EmailJS](https://www.emailjs.com/docs/)
- [Dashboard EmailJS](https://dashboard.emailjs.com/)
- [Templates EmailJS](https://www.emailjs.com/docs/user-guide/creating-email-template/)
- [API Reference](https://www.emailjs.com/docs/api/send/)

## 🔐 Seguridad

⚠️ **IMPORTANTE**:
- Nunca compartas tus API keys públicamente
- Usa variables de entorno para todas las credenciales
- No commitees el archivo `.env` al repositorio
- Usa Private Key solo en backend (nunca en frontend)

---

**¿Necesitas ayuda?** Revisa los logs del backend o contacta al equipo de desarrollo.
