# 📦 PAQUETE DE MIGRACIÓN A EMAILJS

## 🎯 ARCHIVOS A COPIAR EN TU NUEVA VERSIÓN

### ✅ ARCHIVOS OBLIGATORIOS

#### 1. `src/services/email.service.js`
**Acción:** Reemplazar COMPLETAMENTE el archivo existente

**Cambios principales:**
- Eliminado todo el código de Resend
- Agregado `sendEmailWithEmailJS()` con REST API
- Agregado `sendOTPEmail()` para códigos de verificación
- Mantenido SMTP como fallback
- Usa variables de entorno (sin credenciales hardcodeadas)

**⚠️ NO copiar desde el archivo actual - usa el código limpio del repositorio**

---

#### 2. `.env.example`
**Acción:** Crear o actualizar

```env
# ========================================
# EMAILJS CONFIGURATION (Primary Email Service)
# ========================================
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
EMAILJS_TEMPLATE_ID=your_emailjs_template_id

# ========================================
# SMTP CONFIGURATION (Fallback Email Service)
# ========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@yourapp.com

# ========================================
# APPLICATION CONFIGURATION
# ========================================
FRONTEND_URL=http://localhost:4200
PORT=5000
```

---

#### 3. `.gitignore`
**Acción:** Verificar que incluya

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# Dependencies
node_modules/
```

---

#### 4. `package.json`
**Acción:** Agregar dependencia

```json
{
  "dependencies": {
    "node-fetch": "^3.3.2"
  }
}
```

Luego ejecutar: `npm install`

---

### ✅ ARCHIVOS OPCIONALES (RECOMENDADOS)

#### 5. `test_emailjs.js` (raíz del proyecto)
Script para probar EmailJS

#### 6. `test_otp_email.js` (raíz del proyecto)
Script para probar emails OTP

#### 7. `email-templates/otp-verification.html`
Template HTML de referencia para OTP (opcional)

---

### ✅ ARCHIVOS DE DOCUMENTACIÓN

#### 8. `EMAILJS_IMPLEMENTATION_GUIDE.md`
Guía completa de implementación

#### 9. `SECURITY_ALERT.md`
Guía de seguridad y rotación de credenciales

---

## 🚀 PASOS PARA IMPLEMENTAR EN NUEVA VERSIÓN

### Paso 1: Preparar archivos
```bash
# En tu NUEVA versión del proyecto
cd nueva-version-backend

# Crear estructura si no existe
mkdir -p src/services
mkdir -p email-templates
```

### Paso 2: Copiar archivos desde repositorio Git

**Opción A - Copiar desde GitHub:**
```bash
# Clonar el repositorio actualizado
git clone https://github.com/JuanGamer2812/Backend_Proyecto.git temp-emailjs

# Copiar archivos necesarios
cp temp-emailjs/src/services/email.service.js src/services/
cp temp-emailjs/.env.example .env.example
cp temp-emailjs/test_emailjs.js .
cp temp-emailjs/test_otp_email.js .
cp temp-emailjs/EMAILJS_IMPLEMENTATION_GUIDE.md .

# Limpiar
rm -rf temp-emailjs
```

**Opción B - Descargar archivos específicos:**
Ve a: https://github.com/JuanGamer2812/Backend_Proyecto

Descarga estos archivos:
1. `src/services/email.service.js`
2. `.env.example`
3. `test_emailjs.js`
4. `test_otp_email.js`

### Paso 3: Instalar dependencias
```bash
npm install node-fetch@3.3.2
```

### Paso 4: Configurar variables de entorno

**⚠️ IMPORTANTE - Crear tu propio `.env` (NO copiar de ningún lado)**

```bash
# Copiar template
cp .env.example .env

# Editar con tus propias credenciales
# NUNCA uses credenciales de otros archivos
nano .env  # o usa tu editor favorito
```

Contenido de `.env` (con TUS credenciales de EmailJS):
```env
EMAILJS_SERVICE_ID=tu_service_id
EMAILJS_PUBLIC_KEY=tu_public_key
EMAILJS_PRIVATE_KEY=tu_private_key
EMAILJS_TEMPLATE_ID=tu_template_id
```

### Paso 5: Verificar .gitignore
```bash
# Asegurar que .env NO se suba a Git
cat .gitignore | grep ".env"
```

Si no aparece, agregar:
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### Paso 6: Probar localmente
```bash
node test_emailjs.js
```

### Paso 7: Commit (SIN .env)
```bash
# Verificar que .env NO esté en staging
git status

# Debe aparecer como "Untracked" o no aparecer

# Agregar archivos
git add src/services/email.service.js
git add .env.example
git add test_emailjs.js
git add test_otp_email.js
git add package.json
git add .gitignore

# Commit
git commit -m "feat: Migrate to EmailJS email service"

# Push
git push origin main
```

### Paso 8: Configurar Railway (si usas)
1. Dashboard → Proyecto → Settings → Variables
2. Agregar variables de EmailJS
3. Guardar y esperar redespliegue

---

## ⚠️ ADVERTENCIAS DE SEGURIDAD

### ❌ NUNCA HAGAS ESTO:
1. ❌ Copiar el archivo `.env` con credenciales reales
2. ❌ Hacer commit del archivo `.env`
3. ❌ Compartir credenciales en chat, email o documentos
4. ❌ Usar credenciales de otro proyecto
5. ❌ Hardcodear credenciales en el código

### ✅ SIEMPRE HAZ ESTO:
1. ✅ Crear tu propio `.env` con nuevas credenciales
2. ✅ Verificar `.gitignore` antes del primer commit
3. ✅ Usar `.env.example` como template (sin credenciales)
4. ✅ Usar `process.env.VARIABLE` en el código
5. ✅ Rotar credenciales si se exponen

---

## 📋 CHECKLIST FINAL

Antes de hacer push a GitHub:

- [ ] `email.service.js` copiado y actualizado
- [ ] `.env.example` creado (SIN credenciales)
- [ ] `.env` creado localmente (con TUS credenciales)
- [ ] `.env` está en `.gitignore`
- [ ] `node-fetch` instalado
- [ ] Tests locales pasando
- [ ] `git status` NO muestra `.env` en staging
- [ ] Commit hecho
- [ ] Push a GitHub exitoso
- [ ] Variables configuradas en Railway/producción

---

## 🔗 LINKS ÚTILES

- **Repositorio actualizado:** https://github.com/JuanGamer2812/Backend_Proyecto
- **EmailJS Dashboard:** https://dashboard.emailjs.com/
- **Guía completa:** `EMAILJS_IMPLEMENTATION_GUIDE.md`

---

## 📞 SI ALGO SALE MAL

### Problema: GitGuardian detecta credenciales
**Solución:** Ver `SECURITY_ALERT.md` → Rotar credenciales + Limpiar historial

### Problema: EmailJS retorna 403
**Solución:** Dashboard → API Keys → Activar "Allow non-browser API calls"

### Problema: Emails no llegan
**Solución:** 
1. Verificar variables en `.env`
2. Ejecutar `node test_emailjs.js`
3. Revisar logs del backend
4. Verificar límite de 200 emails/mes

---

**¡Todo listo para implementar en tu nueva versión!** 🚀
