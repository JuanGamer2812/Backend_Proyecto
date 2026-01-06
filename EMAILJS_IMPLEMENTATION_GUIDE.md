# 📧 GUÍA DE IMPLEMENTACIÓN - EmailJS Migration

## 📋 RESUMEN
Esta guía contiene **todos los cambios necesarios** para implementar EmailJS en lugar de Resend en tu proyecto backend.

**Fecha de implementación:** 5 de Enero, 2026  
**Versión:** 1.0

---

## 🔧 CAMBIOS REQUERIDOS

### 1️⃣ DEPENDENCIAS (package.json)

#### Instalar:
```bash
npm install node-fetch@3.3.2
```

#### Desinstalar (opcional):
```bash
npm uninstall resend
```

#### package.json - Agregar en dependencies:
```json
{
  "dependencies": {
    "node-fetch": "^3.3.2"
  }
}
```

---

### 2️⃣ VARIABLES DE ENTORNO

#### Archivo: `.env.example` (Template SIN credenciales reales)

```env
# ========================================
# EMAILJS CONFIGURATION (Primary Email Service)
# EmailJS API - https://www.emailjs.com/
# Obtain your credentials from EmailJS Dashboard
# ========================================
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
EMAILJS_TEMPLATE_ID=your_emailjs_template_id

# Templates específicos (opcional)
# EMAILJS_WELCOME_TEMPLATE=template_welcome
# EMAILJS_OTP_TEMPLATE=template_otp

# ========================================
# SMTP CONFIGURATION (Fallback Email Service)
# ========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@yourapp.com
```

#### Archivo: `.env` (TU archivo local - NO SUBIR A GIT)

```env
# Reemplaza con TUS credenciales reales de EmailJS
EMAILJS_SERVICE_ID=tu_service_id_real
EMAILJS_PUBLIC_KEY=tu_public_key_real
EMAILJS_PRIVATE_KEY=tu_private_key_real
EMAILJS_TEMPLATE_ID=tu_template_id_real
```

**⚠️ IMPORTANTE:** El archivo `.env` NO debe estar en Git. Verifica que esté en `.gitignore`

---

### 3️⃣ VERIFICAR .gitignore

#### Archivo: `.gitignore`

Asegúrate de que incluya:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
```

---

### 4️⃣ ARCHIVO PRINCIPAL - email.service.js

#### Ubicación: `src/services/email.service.js`

Este es el archivo MÁS IMPORTANTE. Reemplaza TODO el contenido con el código de este archivo:

👉 **Ver archivo completo:** `EMAILJS_SERVICE_COMPLETE.js` (adjunto)

**Cambios principales:**
- ✅ Eliminado código de Resend
- ✅ Agregado `sendEmailWithEmailJS()` usando REST API
- ✅ Mantenido `sendEmailWithSMTP()` como fallback
- ✅ Agregada función `sendOTPEmail()` para códigos de verificación
- ✅ Todas las funciones usan el mismo template universal

---

### 5️⃣ ARCHIVOS ADICIONALES (OPCIONALES)

#### A) Script de prueba de EmailJS

**Archivo:** `test_emailjs.js` (raíz del proyecto)

```javascript
require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testEmailJS() {
    console.log('🧪 Probando EmailJS...\n');
    
    // Verificar variables
    console.log('EMAILJS_SERVICE_ID:', process.env.EMAILJS_SERVICE_ID ? '✅' : '❌');
    console.log('EMAILJS_PUBLIC_KEY:', process.env.EMAILJS_PUBLIC_KEY ? '✅' : '❌');
    console.log('EMAILJS_PRIVATE_KEY:', process.env.EMAILJS_PRIVATE_KEY ? '✅' : '❌');
    
    if (!process.env.EMAILJS_SERVICE_ID) {
        console.log('\n❌ Configura las variables en .env primero\n');
        process.exit(1);
    }
    
    try {
        const result = await emailService.sendWelcomeEmail(
            'tu_email@gmail.com',
            'Test User'
        );
        console.log('\n✅ Email enviado:', result);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testEmailJS();
```

#### B) Script de prueba de OTP

**Archivo:** `test_otp_email.js` (raíz del proyecto)

```javascript
require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testOTPEmail() {
    const testEmail = 'tu_email@gmail.com';
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('🔐 Código OTP:', otpCode);
    
    try {
        const result = await emailService.sendOTPEmail(
            testEmail,
            'Test User',
            otpCode,
            15
        );
        console.log('✅ Email OTP enviado:', result);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testOTPEmail();
```

---

## 📝 PASOS DE IMPLEMENTACIÓN

### Paso 1: Configurar EmailJS

1. Ve a https://www.emailjs.com/
2. Crea una cuenta o inicia sesión
3. Crea un servicio de email:
   - Dashboard → Email Services → Add New Service
   - Selecciona Gmail (o tu proveedor)
   - Copia el **Service ID**

4. Obtén tus claves API:
   - Dashboard → Account → API Keys
   - Copia **Public Key** y **Private Key**

5. Crea un template universal:
   - Dashboard → Email Templates → Create New Template
   - En el editor HTML, pon SOLO esto:
   ```html
   {{{html_content}}}
   ```
   - Guarda y copia el **Template ID**

6. **IMPORTANTE:** Habilita llamadas desde backend:
   - Dashboard → Account → API Keys
   - Activa: "Allow API calls from non-browser applications"

### Paso 2: Instalar dependencias

```bash
npm install node-fetch@3.3.2
```

### Paso 3: Configurar variables de entorno

Crea o edita tu archivo `.env` local:

```env
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_PUBLIC_KEY=tu_public_key
EMAILJS_PRIVATE_KEY=tu_private_key
EMAILJS_TEMPLATE_ID=template_xxxxxxx
```

### Paso 4: Reemplazar email.service.js

Copia el contenido del archivo `EMAILJS_SERVICE_COMPLETE.js` a `src/services/email.service.js`

### Paso 5: Probar localmente

```bash
node test_emailjs.js
```

Deberías recibir un email de bienvenida.

### Paso 6: Probar OTP

```bash
node test_otp_email.js
```

Deberías recibir un email con un código de 6 dígitos.

### Paso 7: Configurar Railway (Producción)

1. Ve a Railway Dashboard → Tu proyecto Backend
2. Settings → Variables
3. Agrega las variables:
   ```
   EMAILJS_SERVICE_ID=tu_service_id
   EMAILJS_PUBLIC_KEY=tu_public_key
   EMAILJS_PRIVATE_KEY=tu_private_key
   EMAILJS_TEMPLATE_ID=tu_template_id
   FRONTEND_URL=https://tu-frontend.railway.app
   ```
4. Guarda (Railway se redesplegará automáticamente)

### Paso 8: Commit y Push

```bash
git add .
git commit -m "feat: Migrate from Resend to EmailJS for email service"
git push origin main
```

**⚠️ NUNCA hagas commit del archivo `.env`**

---

## 🔍 VERIFICACIÓN

### Checklist de implementación:

- [ ] `node-fetch` instalado
- [ ] Variables de entorno configuradas en `.env`
- [ ] `.env` está en `.gitignore`
- [ ] `email.service.js` actualizado
- [ ] Test local exitoso (`node test_emailjs.js`)
- [ ] Variables configuradas en Railway
- [ ] Commit hecho SIN archivo `.env`
- [ ] Push a GitHub exitoso

---

## 🎯 ENDPOINTS QUE ENVÍAN EMAILS

Estos endpoints ya están integrados y funcionarán automáticamente:

1. **Registro:** `POST /api/auth/register` → Email de bienvenida
2. **Recuperar contraseña:** `POST /api/auth/forgot-password` → Email con token
3. **Verificación:** `POST /api/auth/send-verification` → Email de verificación
4. **Eventos:** Al crear evento → Email de confirmación
5. **Invitaciones:** Al invitar → Email de invitación
6. **Pagos:** Al procesar pago → Email de confirmación

---

## 🚨 SEGURIDAD

### ⚠️ NUNCA SUBAS ESTOS ARCHIVOS A GIT:
- ❌ `.env`
- ❌ Cualquier archivo con credenciales reales

### ✅ SÍ SUBE ESTOS ARCHIVOS:
- ✅ `.env.example` (template sin credenciales)
- ✅ `email.service.js` (usa process.env)
- ✅ Scripts de prueba
- ✅ Documentación

### Si expones credenciales por error:

1. **Rotar inmediatamente** en EmailJS Dashboard
2. Limpiar historial de Git con: `clean_git_history.bat`
3. Actualizar `.env` local
4. Actualizar Railway
5. Force push: `git push origin --force --all`

---

## 📞 SOPORTE

- **EmailJS Docs:** https://www.emailjs.com/docs/
- **EmailJS Dashboard:** https://dashboard.emailjs.com/
- **Límite gratis:** 200 emails/mes, 2 templates

---

## 📚 ARCHIVOS INCLUIDOS

1. ✅ `EMAILJS_SERVICE_COMPLETE.js` - Código completo de email.service.js
2. ✅ `test_emailjs.js` - Script de prueba
3. ✅ `test_otp_email.js` - Script de prueba OTP
4. ✅ `.env.example` - Template de variables
5. ✅ Esta guía de implementación

---

**¡Listo para implementar!** 🚀

Si tienes dudas durante la implementación, revisa `SECURITY_ALERT.md` para guías de seguridad.
