# 🔐 ALERTA DE SEGURIDAD - CREDENCIALES EXPUESTAS

## ✅ PROBLEMA RESUELTO

GitGuardian detectó credenciales expuestas en GitHub. **Las credenciales han sido rotadas y el historial de Git ha sido limpiado.**

### ✅ Acciones Completadas (5 de Enero, 2026):
- ✅ **Credenciales rotadas**: Nuevas credenciales de EmailJS y Cloudinary generadas
- ✅ **Historial limpiado**: Archivo `.env` eliminado de todo el historial de Git
- ✅ **Nuevas credenciales probadas**: EmailJS funcionando correctamente con nuevas claves
- ✅ **Force push completado**: Historial limpio subido a GitHub

### Credenciales Antiguas (YA NO VÁLIDAS - ROTADAS):
- ❌ `EMAILJS_PUBLIC_KEY` = gL0bhfmHL4yqYY_fd  
- ❌ `EMAILJS_PRIVATE_KEY` = LWBOCb7mdnVmH7swZNGKF
- ❌ `CLOUDINARY_API_KEY` = 829595937668126
- ❌ `CLOUDINARY_API_SECRET` = cVYAnjbJK-FNSScI4fLVaAG9j8Y

---

## 🚨 ACCIONES INMEDIATAS REQUERIDAS

### 1. **Rotar Credenciales de EmailJS** (URGENTE)
- Ve a https://dashboard.emailjs.com/admin
- **Account → API Keys**
- Genera nuevas credenciales:
  - Nueva Private Key
  - Nuevo Public Key (opcional pero recomendado)
- Actualiza tu archivo `.env` local
- Configura las nuevas credenciales en Railway

### 2. **Rotar Credenciales de Cloudinary** (URGENTE)
- Ve a https://console.cloudinary.com/settings/security
- **API Keys → Reset API Secret**
- Genera un nuevo API Secret
- Actualiza tu archivo `.env` local
- Configura el nuevo API Secret en Railway

### 3. **Limpiar Historial de Git** (CRÍTICO)

El archivo `.env` fue commiteado en los commits:
```
88be18f - Fix: Configurar EmailJS con API REST
28b3af8 - Configuración para Railway: UTF-8 encoding
```

#### Opción A: Usar BFG Repo-Cleaner (Recomendado)
```bash
# Instalar BFG
# Descarga desde: https://rtyley.github.io/bfg-repo-cleaner/

# Hacer backup del repositorio
cd ..
git clone --mirror https://github.com/JuanGamer2812/Backend_Proyecto.git

# Limpiar el archivo .env del historial
java -jar bfg.jar --delete-files .env Backend_Proyecto.git

# Ir al repositorio espejo y hacer cleanup
cd Backend_Proyecto.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push forzado
git push --force
```

#### Opción B: Usar git filter-repo (Más seguro que filter-branch)
```bash
# Instalar git-filter-repo
pip install git-filter-repo

# Hacer backup
git clone https://github.com/JuanGamer2812/Backend_Proyecto.git backup-repo

# Limpiar historial
git filter-repo --path .env --invert-paths --force

# Push forzado
git push origin --force --all
git push origin --force --tags
```

#### Opción C: Manual con git filter-branch (Última opción)
```bash
# Hacer commit de cambios actuales primero
git add .
git commit -m "Security: Remove .env and add .env.example"

# Eliminar .env del historial
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Limpiar referencias
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ CUIDADO: esto reescribe el historial)
git push origin --force --all
git push origin --force --tags
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] **Rotar EmailJS Private Key**
- [ ] **Rotar EmailJS Public Key** (opcional)
- [ ] **Rotar Cloudinary API Secret**
- [ ] **Limpiar .env del historial de Git**
- [ ] **Verificar que .env está en .gitignore**
- [ ] **Actualizar variables en Railway con nuevas credenciales**
- [ ] **Verificar que .env.example no tiene credenciales reales**
- [ ] **Notificar al equipo sobre el incidente**
- [ ] **Monitorear acceso no autorizado en EmailJS Dashboard**
- [ ] **Monitorear acceso no autorizado en Cloudinary Dashboard**

---

## 🛡️ PREVENCIÓN FUTURA

### 1. **Pre-commit Hook**
Crea un hook para prevenir commits accidentales de credenciales:

```bash
# .git/hooks/pre-commit
#!/bin/sh

# Buscar credenciales expuestas
if git diff --cached --name-only | grep -E '\.env$'; then
    echo "❌ ERROR: Intentando commitear archivo .env"
    echo "Las credenciales no deben ir al repositorio"
    exit 1
fi

# Buscar patrones de credenciales en archivos
if git diff --cached | grep -E '(PRIVATE_KEY|API_SECRET|PASSWORD|JWT_SECRET)=.{20,}'; then
    echo "⚠️  WARNING: Posible credencial detectada en el commit"
    echo "Verifica que no estés exponiendo información sensible"
    exit 1
fi
```

### 2. **Verificar .gitignore**
Asegúrate de que `.gitignore` incluya:
```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
secrets.json
```

### 3. **Usar Variables de Entorno**
- **Desarrollo local**: Usa `.env` (nunca commitear)
- **Producción**: Usa variables de entorno de Railway/Vercel
- **CI/CD**: Usa secrets de GitHub Actions

### 4. **Auditorías Regulares**
```bash
# Buscar credenciales en el repositorio
git log -p | grep -E '(PRIVATE_KEY|API_SECRET|PASSWORD)='

# Usar truffleHog para detectar secretos
pip install truffleHog
trufflehog --regex --entropy=True .
```

---

## 🔄 ROTACIÓN DE CREDENCIALES (Paso a Paso)

### EmailJS:

1. **Dashboard**: https://dashboard.emailjs.com/admin/account
2. **Generar nueva Private Key**:
   - Account → API Keys
   - "Generate New Private Key"
   - Copiar y guardar en archivo `.env` local
3. **Actualizar Railway**:
   - Settings → Variables
   - Editar `EMAILJS_PRIVATE_KEY` con el nuevo valor
4. **Opcional - Nueva Public Key**:
   - Account → API Keys
   - "Generate New Public Key"
   - Actualizar `.env` y Railway

### Cloudinary:

1. **Dashboard**: https://console.cloudinary.com/settings/security
2. **Resetear API Secret**:
   - Security → API Keys
   - "Reset API Secret"
   - Confirmar acción
3. **Copiar nuevo API Secret**:
   - Actualizar archivo `.env` local
4. **Actualizar Railway**:
   - Settings → Variables
   - Editar `CLOUDINARY_API_SECRET` con nuevo valor

---

## 📞 CONTACTO DE SOPORTE

Si necesitas ayuda:
- **EmailJS**: https://www.emailjs.com/docs/support/
- **Cloudinary**: https://support.cloudinary.com/
- **GitHub Security**: https://github.com/security

---

## 📚 RECURSOS ADICIONALES

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [GitGuardian Best Practices](https://www.gitguardian.com/secrets-detection)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

---

## ⏰ TIEMPO ESTIMADO

- **Rotar credenciales**: 10-15 minutos
- **Limpiar historial Git**: 15-30 minutos
- **Actualizar Railway**: 5 minutos
- **Verificar funcionamiento**: 10 minutos

**TOTAL**: ~1 hora

---

## ✅ VERIFICACIÓN POST-ROTACIÓN

Después de rotar credenciales, verifica:

```bash
# Test de EmailJS
node test_emailjs.js

# Test de OTP
node test_otp_email.js

# Test de registro (incluye Cloudinary)
curl -X POST http://localhost:5000/api/auth/register \
  -F "email=test@example.com" \
  -F "password=Test1234!" \
  -F "nombre_usuario=TestUser" \
  -F "foto_perfil=@test.jpg"
```

Si todos los tests pasan ✅, las credenciales fueron rotadas exitosamente.
