# 📧 API de Email - ÉCLAT Eventos

## Descripción General

Sistema completo de envío de emails transaccionales y notificaciones usando **Nodemailer**. Incluye templates HTML profesionales para diferentes tipos de comunicación.

---

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Configuración SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicacion
EMAIL_FROM=noreply@eclat.com

# Frontend URL
FRONTEND_URL=http://localhost:4200
```

### Configuración de Gmail (Ejemplo)

Para usar Gmail como proveedor SMTP:

1. **Activar verificación en 2 pasos** en tu cuenta de Google
2. **Generar contraseña de aplicación**:
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Correo" y "Windows Computer"
   - Copiar la contraseña generada (16 caracteres)
   - Usar esa contraseña en `EMAIL_PASSWORD`

### Otros Proveedores SMTP

```javascript
// SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxx

// Mailgun
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password

// Outlook
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

---

## 📚 Endpoints

### 1. Email de Bienvenida

**Automático al registrarse** + Manual disponible

```http
POST /api/email/welcome
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email de bienvenida enviado exitosamente",
  "data": {
    "success": true,
    "messageId": "<unique-message-id@smtp.example.com>",
    "response": "250 Message accepted"
  }
}
```

---

### 2. Email de Recuperación de Contraseña

```http
POST /api/email/password-reset
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Template incluye:**
- Enlace directo a `/recuperar-cuenta?token=XXX`
- Advertencia de expiración (1 hora)
- Medidas de seguridad

---

### 3. Confirmación de Evento Creado

```http
POST /api/email/event-confirmation
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "eventoData": {
    "nombre_evento": "Boda de Juan y María",
    "tipo_evento": "Boda",
    "fecha_inicio": "2024-06-15T18:00:00Z",
    "fecha_fin": "2024-06-16T02:00:00Z",
    "precio_evento": "5000.00"
  }
}
```

**Características del template:**
- Detalles completos del evento
- Botón CTA para ver el evento
- Próximos pasos sugeridos

---

### 4. Invitación Individual a Evento

```http
POST /api/email/event-invitation
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "invitadoEmail": "invitado@example.com",
  "invitadoNombre": "María López",
  "eventoData": {
    "nombre_evento": "Boda de Juan y María",
    "fecha_inicio": "2024-06-15T18:00:00Z",
    "lugar": "Jardín Botánico de Bogotá",
    "descripcion": "Nos complace invitarte a nuestra boda..."
  },
  "codigoInvitacion": "INV-2024-ABCD-1234"
}
```

**Template incluye:**
- Diseño elegante de invitación
- Botón RSVP con enlace personalizado
- Detalles de fecha, hora y lugar

---

### 5. Invitaciones Masivas

```http
POST /api/email/bulk-invitations
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "eventoData": {
    "nombre_evento": "Boda de Juan y María",
    "fecha_inicio": "2024-06-15T18:00:00Z",
    "lugar": "Jardín Botánico"
  },
  "invitados": [
    {
      "email": "invitado1@example.com",
      "nombre": "Pedro García",
      "codigo_invitacion": "INV-2024-ABCD-0001"
    },
    {
      "email": "invitado2@example.com",
      "nombre": "Ana Rodríguez",
      "codigo_invitacion": "INV-2024-ABCD-0002"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Invitaciones procesadas: 48 enviadas, 2 fallidas",
  "data": {
    "total": 50,
    "sent": 48,
    "failed": 2,
    "errors": [
      {
        "email": "invalid-email",
        "error": "Invalid email address"
      }
    ]
  }
}
```

**Características:**
- Envío por lotes (5 a la vez)
- Manejo individual de errores
- Reporte detallado de resultados

---

### 6. Confirmación de Pago

```http
POST /api/email/payment-confirmation
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "pagoData": {
    "id_pago": 12345,
    "monto": 5000.00,
    "metodo_pago": "Tarjeta de Crédito"
  }
}
```

**Template incluye:**
- Número de orden
- Monto total destacado
- Botón para descargar recibo
- Información de transacción

---

### 7. Email Personalizado (Admin)

```http
POST /api/email/custom
Content-Type: application/json
Authorization: Bearer {admin_access_token}
```

**Body:**
```json
{
  "to": "destinatario@example.com",
  "subject": "Asunto del Email",
  "text": "Versión en texto plano",
  "html": "<h1>Versión HTML</h1><p>Contenido personalizado</p>"
}
```

**Restricciones:**
- Solo usuarios con rol `admin`
- Requiere al menos `text` o `html`

---

## 🎨 Templates HTML

Todos los templates incluyen:
- ✅ Diseño responsive (móvil y desktop)
- ✅ Gradientes modernos
- ✅ Botones CTA destacados
- ✅ Branding consistente de ÉCLAT
- ✅ Footer con copyright
- ✅ Versión en texto plano (fallback)

### Ejemplo de Template (Bienvenida)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .button { background: #667eea; color: white; padding: 12px 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Bienvenido a ÉCLAT Eventos!</h1>
        </div>
        <!-- Contenido personalizado -->
    </div>
</body>
</html>
```

---

## 🔄 Integración Automática

### En el Registro de Usuario

El email de bienvenida se envía automáticamente:

```javascript
// src/controllers/auth.controller.js
const result = await authService.register({ nombre, email, password, telefono });

// Enviar email de bienvenida (no bloqueante)
emailService.sendWelcomeEmail(email, nombre)
    .catch(err => console.error('Error al enviar email:', err));
```

### En Creación de Evento (Futuro)

```javascript
// Después de crear evento exitosamente
emailService.sendEventConfirmationEmail(userEmail, userName, eventoData)
    .catch(err => console.error('Error al enviar confirmación:', err));
```

---

## 🛡️ Seguridad y Mejores Prácticas

### 1. Protección de Endpoints
- **Públicos**: `/welcome`, `/password-reset` (usados por flujos públicos)
- **Autenticados**: Confirmaciones de evento, invitaciones, pagos
- **Admin solo**: `/custom` (email personalizado)

### 2. Rate Limiting (Recomendado)

```javascript
// Instalar: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 emails
    message: 'Demasiados emails enviados, intenta más tarde'
});

app.use('/api/email', emailLimiter);
```

### 3. Validación de Emails

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
}
```

### 4. Manejo de Errores

Todos los endpoints devuelven errores estructurados:

```json
{
  "success": false,
  "error": "Error al enviar email",
  "details": "Connection timeout"
}
```

---

## 📊 Monitoreo y Logs

### Logs de Envío

```javascript
// Los logs se muestran en consola
console.log('Email enviado:', info.messageId);
console.error('Error al enviar email:', error);
```

### Verificar Estado de Envío

```javascript
// Para producción, considera usar un servicio de tracking
// Como SendGrid Event Webhook o Mailgun Analytics
```

---

## 🚀 Uso desde el Frontend

### Ejemplo en Angular

```typescript
// src/app/service/email.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private baseUrl = 'http://localhost:3000/api/email';

  constructor(private http: HttpClient) {}

  sendEventInvitation(data: any) {
    return this.http.post(`${this.baseUrl}/event-invitation`, data);
  }

  sendBulkInvitations(data: any) {
    return this.http.post(`${this.baseUrl}/bulk-invitations`, data);
  }
}
```

### Uso en Componente

```typescript
// Enviar invitación individual
this.emailService.sendEventInvitation({
  invitadoEmail: 'maria@example.com',
  invitadoNombre: 'María López',
  eventoData: this.evento,
  codigoInvitacion: 'INV-001'
}).subscribe({
  next: (res) => console.log('Invitación enviada', res),
  error: (err) => console.error('Error', err)
});

// Envío masivo
this.emailService.sendBulkInvitations({
  eventoData: this.evento,
  invitados: this.listaInvitados
}).subscribe({
  next: (res) => {
    console.log(`${res.data.sent} invitaciones enviadas`);
    console.log(`${res.data.failed} fallidas`);
  }
});
```

---

## 🧪 Testing

### Test Manual con curl

```bash
# Email de bienvenida
curl -X POST http://localhost:3000/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "nombre": "Usuario Test"
  }'

# Invitación a evento (requiere token)
curl -X POST http://localhost:3000/api/email/event-invitation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "invitadoEmail": "invitado@example.com",
    "invitadoNombre": "María López",
    "eventoData": {
      "nombre_evento": "Test Event",
      "fecha_inicio": "2024-12-31T20:00:00Z"
    },
    "codigoInvitacion": "TEST-001"
  }'
```

### Test con Postman

1. Importar colección de endpoints
2. Configurar variables de entorno (`baseUrl`, `accessToken`)
3. Ejecutar tests individuales o en batch

---

## 📝 Próximas Mejoras

- [ ] **Plantillas dinámicas** desde base de datos
- [ ] **Adjuntos** (PDFs de factura, itinerarios)
- [ ] **Tracking** de apertura y clics
- [ ] **Programación** de envíos futuros
- [ ] **Unsubscribe** (dar de baja de notificaciones)
- [ ] **Internacionalización** (i18n - múltiples idiomas)
- [ ] **Preview** de emails antes de enviar
- [ ] **Historial** de emails enviados por usuario

---

## 🐛 Troubleshooting

### Error: "Invalid login"
**Causa:** Contraseña incorrecta o autenticación de 2 pasos no configurada
**Solución:** Usar contraseña de aplicación de Gmail

### Error: "Connection timeout"
**Causa:** Firewall bloqueando puerto 587
**Solución:** Verificar configuración de red o usar puerto 465 (SSL)

### Error: "Recipient address rejected"
**Causa:** Email del destinatario inválido
**Solución:** Validar formato de email antes de enviar

### Emails llegan a spam
**Causa:** Falta de SPF/DKIM records
**Solución:** Usar servicio profesional (SendGrid, Mailgun) o configurar DNS

---

## 📄 Licencia

Parte del sistema ÉCLAT Eventos © 2024
