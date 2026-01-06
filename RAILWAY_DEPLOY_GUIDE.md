# 🚀 Guía de Deployment en Railway

## Backend Setup

### 1. Variables de Entorno Requeridas en Railway

Configurar las siguientes variables en el dashboard de Railway:

```bash
# Database (Railway PostgreSQL)
PG_HOST=<tu-host-railway>.proxy.rlwy.net
PG_PORT=<puerto-railway>
PG_USER=postgres
PG_PASSWORD=<password-railway>
PG_DATABASE=railway_ec

# JWT
JWT_SECRET=<genera-un-string-aleatorio-seguro>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email (Resend - Producción)
RESEND_API_KEY=<tu-api-key-resend>
RESEND_MODE=onboarding
RESEND_AUTHORIZED_EMAILS=admin@gmail.com,support@gmail.com
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_DOMAIN=noreply@tudominio.com
TEST_VERIFICATION_EMAIL=test@gmail.com

# Email (Gmail - Opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<tu-email@gmail.com>
EMAIL_PASSWORD=<app-password-gmail>
EMAIL_FROM=noreply@eclat.com

# Cloudinary (IMPORTANTE para imágenes)
CLOUDINARY_CLOUD_NAME=diyfn48sg
CLOUDINARY_API_KEY=829595937668126
CLOUDINARY_API_SECRET=cVYAnjbJK-FNSScI4fLVaAG9j8Y

# Stripe
STRIPE_SECRET_KEY=<tu-stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<tu-stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<tu-webhook-secret>

# Frontend URL (Railway)
FRONTEND_URL=https://<tu-frontend>.up.railway.app

# Port (Railway lo asigna automáticamente)
PORT=5000
```

### 2. Base de Datos

La base de datos ya está configurada con:
- ✅ Encoding: UTF-8
- ✅ Locale: es-EC (Español Ecuador)
- ✅ Base de datos: `railway_ec`

### 3. Cambios Realizados

✅ **db.js**: Agregado `client_encoding: 'UTF8'`
✅ **cloudinary.config.js**: Configuración de Cloudinary para imágenes
✅ **auth.controller.js**: Upload de imágenes a Cloudinary (register y updateProfile)
✅ **.env.example**: Template completo de variables de entorno
✅ **package.json**: Agregada dependencia `cloudinary`

### 4. Deploy

1. **Crear repositorio Git** (si no existe):
```bash
git init
git add .
git commit -m "Configuración para Railway"
```

2. **Conectar con Railway**:
   - Ir a railway.app
   - New Project → Deploy from GitHub repo
   - Seleccionar el repositorio

3. **Configurar variables de entorno** en Railway Dashboard

4. **Railway detectará automáticamente** que es un proyecto Node.js y ejecutará:
```bash
npm install
npm start
```

### 5. Verificaciones Post-Deploy

- ✅ Backend corriendo en: `https://<tu-proyecto>.up.railway.app`
- ✅ Test de salud: `GET /api/health` o `GET /`
- ✅ Login funcional: `POST /api/auth/login`
- ✅ Imágenes subiendo a Cloudinary

---

## Frontend Setup

### 1. Configurar URL del Backend

Editar `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://<tu-backend>.up.railway.app/api'
};
```

### 2. Build para Producción

```bash
npm run build --prod
```

### 3. Deploy en Railway

Similar al backend, conectar repositorio y Railway detectará que es Angular.

---

## 📋 Checklist Final

Backend:
- [ ] Variables de entorno configuradas en Railway
- [ ] Base de datos `railway_ec` seleccionada
- [ ] Cloudinary credentials agregadas
- [ ] Backend desplegado y funcionando

Frontend:
- [ ] `environment.prod.ts` con URL correcta
- [ ] Build de producción exitoso
- [ ] Frontend desplegado

Database:
- [ ] Datos migrados a `railway_ec`
- [ ] Caracteres especiales (ñ, tildes) visibles correctamente
- [ ] Conexión con encoding UTF-8

---

## 🆘 Troubleshooting

**Error: Caracteres especiales se ven mal**
- Verificar que `PG_DATABASE=railway_ec` (no `railway`)
- La base de datos `railway_ec` usa locale `es-EC`

**Error: Imágenes no cargan**
- Verificar variables CLOUDINARY_* en Railway
- Check logs: cloudinary upload errors

**Error: CORS**
- Verificar `FRONTEND_URL` en backend
- Check headers en `src/app.js` o `src/middleware/cors.js`
