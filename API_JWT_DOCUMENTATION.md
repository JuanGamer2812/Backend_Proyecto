# ============================================================================
# DOCUMENTACIÓN API REST CON JWT - PROYECTO ECLAT
# ============================================================================

## Configuración Base
URL_BASE=http://localhost:3000/api

---

## 1. AUTENTICACIÓN

### 1.1. Registrar Usuario
**Endpoint:** POST /auth/register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123",
    "telefono": "0987654321"
  }'
```

**Respuesta:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "0987654321",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

### 1.2. Iniciar Sesión
**Endpoint:** POST /auth/login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

### 1.3. Renovar Token
**Endpoint:** POST /auth/refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }'
```

**Respuesta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

### 1.4. Obtener Usuario Actual
**Endpoint:** GET /auth/me
**Requiere:** Token JWT

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "0987654321",
  "role": "user",
  "fecha_registro": "2025-12-22T10:30:00.000Z"
}
```

---

### 1.5. Cerrar Sesión
**Endpoint:** POST /auth/logout
**Requiere:** Token JWT

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Respuesta:**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

## 2. PROVEEDORES (PROTEGIDO CON JWT)

### 2.1. Listar Proveedores (Público)
**Endpoint:** GET /proveedor

```bash
curl -X GET http://localhost:3000/api/proveedor
```

---

### 2.2. Crear Proveedor (Solo Admin)
**Endpoint:** POST /proveedor
**Requiere:** Token JWT + Role Admin

```bash
curl -X POST http://localhost:3000/api/proveedor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Proveedor XYZ",
    "categoria": "Catering",
    "descripcion": "Servicio de catering profesional"
  }'
```

**Respuesta exitosa:**
```json
{
  "id_proveedor": 1,
  "nombre": "Proveedor XYZ",
  "categoria": "Catering",
  "descripcion": "Servicio de catering profesional"
}
```

**Respuesta si no es admin:**
```json
{
  "error": "Acceso denegado",
  "message": "Requiere permisos de administrador"
}
```

---

### 2.3. Actualizar Proveedor (Solo Admin)
**Endpoint:** PUT /proveedor/:id
**Requiere:** Token JWT + Role Admin

```bash
curl -X PUT http://localhost:3000/api/proveedor/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Proveedor XYZ Actualizado",
    "categoria": "Catering Premium"
  }'
```

---

### 2.4. Eliminar Proveedor (Solo Admin)
**Endpoint:** DELETE /proveedor/:id
**Requiere:** Token JWT + Role Admin

```bash
curl -X DELETE http://localhost:3000/api/proveedor/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

---

## 3. CÓDIGOS DE RESPUESTA

- **200 OK:** Operación exitosa
- **201 Created:** Recurso creado exitosamente
- **400 Bad Request:** Datos inválidos
- **401 Unauthorized:** No autenticado o token inválido
- **403 Forbidden:** Sin permisos suficientes
- **404 Not Found:** Recurso no encontrado
- **409 Conflict:** Conflicto (ej: email duplicado)
- **500 Internal Server Error:** Error del servidor

---

## 4. ESTRUCTURA DEL TOKEN JWT

El token incluye:
```json
{
  "id": 1,
  "email": "juan@example.com",
  "nombre": "Juan Pérez",
  "role": "user",
  "iat": 1703250000,
  "exp": 1703336400
}
```

- **iat:** Fecha de emisión (timestamp)
- **exp:** Fecha de expiración (timestamp)

---

## 5. MANEJO DE ERRORES

### Token Expirado (401)
```json
{
  "error": "Token expirado",
  "message": "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
}
```

**Solución:** Usar el refresh token para obtener un nuevo access token

### Token Inválido (403)
```json
{
  "error": "Token inválido",
  "message": "El token proporcionado no es válido"
}
```

**Solución:** Iniciar sesión nuevamente

### Sin Permisos (403)
```json
{
  "error": "Acceso denegado",
  "message": "Requiere permisos de administrador"
}
```

**Solución:** Esta operación solo puede realizarse con una cuenta de administrador

---

## 6. FLUJO RECOMENDADO EN EL FRONTEND

### 6.1. Login
1. Usuario ingresa credenciales
2. Frontend hace POST a `/auth/login`
3. Guardar `accessToken` y `refreshToken` en localStorage (si remember) o sessionStorage
4. Guardar usuario en storage
5. Agregar token en headers de futuras peticiones

### 6.2. Peticiones Autenticadas
```typescript
// Angular Interceptor
const token = localStorage.getItem('accessToken');
req = req.clone({
  setHeaders: {
    Authorization: `Bearer ${token}`
  }
});
```

### 6.3. Renovación Automática
1. Si una petición retorna 401 (token expirado)
2. Usar refresh token para obtener nuevo access token
3. Reintentar la petición original
4. Si el refresh falla, redirigir a login

### 6.4. Logout
1. Llamar POST `/auth/logout` (opcional)
2. Limpiar tokens y usuario del storage
3. Redirigir a página de login

---

## 7. SEGURIDAD

### Buenas Prácticas:
- ✅ Nunca exponer JWT_SECRET
- ✅ Usar HTTPS en producción
- ✅ Tokens de corta duración para access token
- ✅ Refresh tokens de larga duración pero revocables
- ✅ Validar y sanitizar todos los inputs
- ✅ Implementar rate limiting
- ✅ Logs de auditoría para acciones críticas

### No Hacer:
- ❌ Guardar contraseñas sin encriptar
- ❌ Exponer tokens en URLs
- ❌ Tokens sin expiración
- ❌ Confiar solo en el frontend para seguridad

---

## 8. TESTING CON POSTMAN

### Colección de ejemplo:

1. **Crear Variable de Entorno:**
   - `base_url`: http://localhost:3000/api
   - `access_token`: (se actualizará automáticamente)

2. **Script Pre-request para Login:**
```javascript
// Guardar token después de login
pm.environment.set("access_token", pm.response.json().accessToken);
```

3. **Header Automático:**
```
Authorization: Bearer {{access_token}}
```

---

## 9. MIGRACIÓN DESDE LOCALSTORAGE A JWT

Para migrar usuarios existentes:

```sql
-- Actualizar contraseñas encriptadas (ejecutar una vez)
-- Nota: Las contraseñas actuales en texto plano deben ser rehashed con bcrypt
UPDATE usuario 
SET password = '$2a$10$hashedPasswordExample' 
WHERE password NOT LIKE '$2a$%';
```

**Recomendación:** Pedir a los usuarios que restablezcan su contraseña la primera vez que inicien sesión con el nuevo sistema.

---

## FIN DE LA DOCUMENTACIÓN
