# 📧 Migración Completada: Resend → EmailJS

## ✅ Cambios Realizados

### 1. **Dependencias Actualizadas**
- ✅ Instalado `@emailjs/nodejs`
- ✅ Desinstalado `resend`
- ✅ Mantenido `nodemailer` como fallback

### 2. **Código Modificado**

#### `src/services/email.service.js`
- ✅ Reemplazada configuración de Resend por EmailJS
- ✅ Implementada función `sendEmailWithEmailJS()`
- ✅ Implementada función `sendEmailWithSMTP()` como fallback
- ✅ Actualizada función principal `sendEmail()` con prioridad EmailJS
- ✅ Convertida `sendVerificationEmailWithResend()` → `sendVerificationEmail()`
- ✅ Actualizada `sendTemporaryPasswordEmail()` para usar EmailJS
- ✅ Agregado parámetro `toName` y `templateId` en todas las funciones

### 3. **Archivos Nuevos**
- ✅ `EMAILJS_SETUP.md` - Guía completa de configuración
- ✅ `.env.example` actualizado con variables de EmailJS

## 🔧 Configuración Requerida

### Variables de Entorno Mínimas

Agrega estas variables en Railway (o .env local):

```bash
# EmailJS - REQUERIDO
EMAILJS_SERVICE_ID=tu_service_id
EMAILJS_PUBLIC_KEY=tu_public_key
EMAILJS_PRIVATE_KEY=tu_private_key

# Template por defecto (opcional)
EMAILJS_TEMPLATE_ID=tu_template_id

# SMTP Fallback (opcional pero recomendado)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_app
EMAIL_FROM=noreply@eclat.com
```

## 🚀 Próximos Pasos

### 1. **Crear Cuenta en EmailJS**
1. Ir a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Registrarse gratis
3. Verificar email

### 2. **Configurar Servicio**
1. Dashboard → **Email Services** → **Add New Service**
2. Seleccionar Gmail/Outlook/etc.
3. Conectar tu cuenta de email
4. Copiar el **Service ID**

### 3. **Crear Template**
1. Dashboard → **Email Templates** → **Create New Template**
2. Usar este contenido básico:
   ```html
   <div style="font-family: Arial;">
     <h2>Hola {{to_name}},</h2>
     <p>{{message}}</p>
     <div>{{{html_content}}}</div>
     <p>{{from_name}}</p>
   </div>
   ```
3. Subject: `{{subject}}`
4. Copiar el **Template ID**

### 4. **Obtener API Keys**
1. Dashboard → **Account** → **General**
2. Copiar **Public Key**
3. Copiar **Private Key**

### 5. **Configurar en Railway**
1. Ir a tu proyecto Backend en Railway
2. Settings → **Variables**
3. Agregar las 3 variables de EmailJS
4. El backend se reiniciará automáticamente

## 📊 Funcionamiento

### Flujo de Envío de Emails

```
sendEmail()
    ↓
EmailJS configurado? 
    ↓ SÍ
    → sendEmailWithEmailJS()
        ↓ ÉXITO
        → Email enviado ✅
        ↓ ERROR
        → sendEmailWithSMTP() (fallback)
    ↓ NO
    → sendEmailWithSMTP()
```

### Prioridad de Servicios

1. **EmailJS** (si está configurado)
2. **SMTP/Nodemailer** (fallback automático)

## 🧪 Pruebas

### Verificar que EmailJS funciona:

1. Inicia el backend:
   ```bash
   npm start
   ```

2. Registra un usuario nuevo desde el frontend

3. Verifica los logs:
   ```
   ✅ Correcto:
   [email.service] Usando EmailJS para enviar email a: usuario@test.com
   [EmailJS] Email enviado exitosamente: OK
   
   ⚠️ Fallback activado:
   [email.service] EmailJS no configurado, usando SMTP...
   [SMTP] Email enviado: <message-id>
   ```

4. Revisa tu bandeja de entrada (y spam)

## 📝 Compatibilidad

### Código Existente
- ✅ Todas las funciones anteriores siguen funcionando
- ✅ `sendVerificationEmailWithResend()` es ahora un alias de `sendVerificationEmail()`
- ✅ No requiere cambios en controllers/services que usen estas funciones

### Tipos de Email Soportados
- ✅ Email de Bienvenida
- ✅ Recuperación de Contraseña (contraseña temporal)
- ✅ Verificación de Email
- ✅ Confirmación de Evento
- ✅ Invitación a Evento
- ✅ Confirmación de Pago
- ✅ RSVP (confirmación/rechazo)

## 🔍 Troubleshooting

### "EmailJS not configured"
→ Agrega `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`

### Emails no llegan
→ Verifica spam, revisa EmailJS dashboard → Activity Log

### Error en template
→ Verifica que el template tenga los campos: `{{to_name}}`, `{{message}}`, `{{{html_content}}}`

### Fallback a SMTP se activa siempre
→ EmailJS no está configurado correctamente, revisa las 3 variables

## 📚 Documentación Completa

Lee `EMAILJS_SETUP.md` para instrucciones detalladas paso a paso.

## 💰 Límites de EmailJS

- **Gratis**: 200 emails/mes
- **Personal** ($15/mes): 1,000 emails/mes
- **Pro** ($45/mes): 10,000 emails/mes

Para más volumen, el sistema automáticamente usará SMTP.

---

✅ **Migración completada exitosamente**
