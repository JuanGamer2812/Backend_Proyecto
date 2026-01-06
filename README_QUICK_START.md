# 🚀 IMPLEMENTACIÓN RÁPIDA - EmailJS para Nueva Versión

## ✅ TODO ESTÁ LISTO EN GITHUB

Todos los archivos están disponibles en:
**https://github.com/JuanGamer2812/Backend_Proyecto**

---

## 📥 PASO 1: DESCARGAR ARCHIVOS (30 segundos)

Descarga estos 3 archivos desde GitHub:

### Opción A: Descarga Directa (Recomendado)

```bash
# En tu NUEVA versión del proyecto
cd tu-nueva-version/

# Descargar email.service.js
curl https://raw.githubusercontent.com/JuanGamer2812/Backend_Proyecto/main/COPY_THIS_email.service.js -o src/services/email.service.js

# Descargar test_emailjs.js
curl https://raw.githubusercontent.com/JuanGamer2812/Backend_Proyecto/main/COPY_THIS_test_emailjs.js -o test_emailjs.js

# Descargar test_otp_email.js
curl https://raw.githubusercontent.com/JuanGamer2812/Backend_Proyecto/main/COPY_THIS_test_otp_email.js -o test_otp_email.js

# Descargar .env.example
curl https://raw.githubusercontent.com/JuanGamer2812/Backend_Proyecto/main/.env.example -o .env.example
```

### Opción B: Manual

1. Ve a: https://github.com/JuanGamer2812/Backend_Proyecto
2. Descarga estos archivos:
   - `COPY_THIS_email.service.js` → Guardar como `src/services/email.service.js`
   - `COPY_THIS_test_emailjs.js` → Guardar como `test_emailjs.js`
   - `COPY_THIS_test_otp_email.js` → Guardar como `test_otp_email.js`
   - `.env.example` → Guardar como `.env.example`

---

## ⚙️ PASO 2: INSTALAR DEPENDENCIAS (30 segundos)

```bash
npm install node-fetch@3.3.2
```

---

## 🔑 PASO 3: OBTENER CREDENCIALES DE EMAILJS (5 minutos)

### 1. Crear cuenta en EmailJS
- Ve a: https://www.emailjs.com/
- Regístrate o inicia sesión

### 2. Crear servicio de email
- Dashboard → **Email Services** → **Add New Service**
- Selecciona **Gmail** (o tu proveedor)
- Conecta tu cuenta de Gmail
- **Copia el Service ID** (ejemplo: `service_abc123`)

### 3. Obtener API Keys
- Dashboard → **Account** → **API Keys**
- **Copia Public Key** (ejemplo: `abc123xyz`)
- Click en **"Generate New Private Key"**
- **Copia Private Key** (ejemplo: `def456uvw`)

### 4. Crear Template Universal
- Dashboard → **Email Templates** → **Create New Template**
- En el editor HTML, **borra todo** y pon SOLO esto:
  ```html
  {{{html_content}}}
  ```
- **Guarda** el template
- **Copia el Template ID** (ejemplo: `template_abc123`)

### 5. Habilitar API desde backend (CRÍTICO)
- Dashboard → **Account** → **API Keys**
- ✅ Activar: **"Allow API calls from non-browser applications"**

---

## 📝 PASO 4: CONFIGURAR .env (1 minuto)

```bash
# Copiar template
cp .env.example .env

# Editar con tus credenciales
nano .env
```

**Contenido de `.env`** (reemplaza con TUS credenciales):

```env
# EmailJS (Reemplaza con tus credenciales reales)
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_PUBLIC_KEY=abc123xyz
EMAILJS_PRIVATE_KEY=def456uvw
EMAILJS_TEMPLATE_ID=template_abc123

# SMTP Fallback (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=noreply@eclat.com

# Frontend
FRONTEND_URL=http://localhost:4200
PORT=5000
```

---

## 🧪 PASO 5: PROBAR (1 minuto)

### Editar email de prueba en test_emailjs.js

Abre `test_emailjs.js` y cambia la línea 32:

```javascript
const testEmail = 'TU_EMAIL@gmail.com';  // ← CAMBIA ESTO
```

### Ejecutar test

```bash
node test_emailjs.js
```

**Deberías ver:**
```
✅ Email enviado exitosamente!
🎉 EmailJS está configurado correctamente!
```

**Revisa tu email** (inbox o spam) - deberías recibir el email de bienvenida 🎉

---

## 🔒 PASO 6: ASEGURAR .gitignore (30 segundos)

```bash
# Verificar que .env NO se suba a Git
cat .gitignore | grep ".env"
```

Si NO aparece, agregar:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

**Verificar:**

```bash
git status
```

El archivo `.env` **NO debe aparecer** en "Changes to be committed" o "Untracked files".

---

## 💾 PASO 7: COMMIT Y PUSH (1 minuto)

```bash
# Ver estado
git status

# Agregar SOLO archivos seguros
git add src/services/email.service.js
git add test_emailjs.js
git add test_otp_email.js
git add .env.example
git add .gitignore
git add package.json

# Commit
git commit -m "feat: Add EmailJS email service integration"

# Push
git push origin main
```

**⚠️ CRÍTICO:** El archivo `.env` NO debe estar en el commit.

---

## 🌐 PASO 8: CONFIGURAR RAILWAY (Producción) (2 minutos)

Si usas Railway para desplegar:

1. Ve a: https://railway.app/dashboard
2. Selecciona tu **proyecto Backend**
3. Click en **Settings → Variables**
4. Agrega estas variables:

```
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_PUBLIC_KEY=abc123xyz
EMAILJS_PRIVATE_KEY=def456uvw
EMAILJS_TEMPLATE_ID=template_abc123
FRONTEND_URL=https://tu-frontend.railway.app
```

5. **Guarda** - Railway se redesplegará automáticamente (2-3 min)

---

## ✅ VERIFICACIÓN FINAL

### Checklist:

- [ ] Archivos descargados de GitHub
- [ ] `npm install node-fetch@3.3.2` ejecutado
- [ ] Cuenta de EmailJS creada
- [ ] Servicio de email configurado
- [ ] API Keys obtenidas
- [ ] Template universal creado (`{{{html_content}}}`)
- [ ] "Allow non-browser API calls" activado
- [ ] Archivo `.env` creado con credenciales
- [ ] Email de prueba cambiado en test_emailjs.js
- [ ] Test local exitoso (`node test_emailjs.js`)
- [ ] `.env` en `.gitignore`
- [ ] Commit hecho SIN archivo `.env`
- [ ] Push a GitHub exitoso
- [ ] Variables configuradas en Railway

---

## 🎯 ENDPOINTS QUE ENVÍAN EMAILS

Estos endpoints ya funcionan automáticamente:

1. **Registro:** `POST /api/auth/register`
   - → Email de bienvenida

2. **Recuperar contraseña:** `POST /api/auth/forgot-password`
   - → Email con token de recuperación

3. **Código OTP:** Función `sendOTPEmail(email, nombre, codigo)`
   - → Email con código de 6 dígitos

---

## 🔥 QUICK TEST EN PRODUCCIÓN

Una vez desplegado en Railway:

1. Ve a tu frontend en producción
2. Regístrate con tu email real
3. **Deberías recibir** email de bienvenida de ÉCLAT

---

## 🚨 TROUBLESHOOTING

### Problema: "EmailJS API error: 403"
**Solución:** Dashboard → Account → API Keys → Activar "Allow non-browser applications"

### Problema: "No configuration provided"
**Solución:** Verifica que las variables en `.env` estén configuradas

### Problema: GitGuardian detecta credenciales
**Solución:**
1. Rotar credenciales en EmailJS Dashboard
2. Limpiar historial: `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all`
3. Force push: `git push origin --force --all`

### Problema: Emails no llegan
**Solución:**
1. Revisar spam
2. Verificar límite de 200 emails/mes en EmailJS
3. Ejecutar `node test_emailjs.js` para diagnosticar

---

## 📚 DOCUMENTACIÓN COMPLETA

Archivos disponibles en GitHub:

- `EMAILJS_IMPLEMENTATION_GUIDE.md` - Guía completa detallada
- `MIGRATION_PACKAGE.md` - Instrucciones paso a paso
- `SECURITY_ALERT.md` - Guía de seguridad
- `SECURITY_RESOLVED.md` - Reporte de incidente resuelto

---

## 🎉 ¡LISTO!

**Tiempo total de implementación:** ~10-15 minutos

Tu sistema de emails ahora usa EmailJS con:
- ✅ 200 emails gratis/mes
- ✅ Template universal para todos los tipos de email
- ✅ Fallback a SMTP si falla EmailJS
- ✅ Código OTP para verificación
- ✅ Sin credenciales expuestas en GitHub

---

## 📞 SOPORTE

- **EmailJS Docs:** https://www.emailjs.com/docs/
- **Dashboard:** https://dashboard.emailjs.com/
- **Repositorio:** https://github.com/JuanGamer2812/Backend_Proyecto

---

**¡Disfruta tu sistema de emails! 🚀**
