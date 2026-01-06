# 🧪 PRUEBAS - OPCIÓN 2: Horas de Música en Características

## 1. Obtener JWT Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eclatrespaldo.com",
    "password": "tu_password"
  }'
```

**Respuesta esperada**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "message": "Login exitoso"
}
```

Guarda el `access_token` para los siguientes requests.

---

## 2. Crear Proveedor Música CON Horas

```bash
curl -X POST http://localhost:3000/api/proveedor \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "nom_empresa_proveedor=DJ Sonido Master" \
  -F "categoria_proveedor=Música" \
  -F "genero=Reggaeton" \
  -F "precio=500000" \
  -F "porHora=true" \
  -F "horaInicio=19" \
  -F "horaFin=06" \
  -F "id_plan=2"
```

**Respuesta esperada** (201 Created):
```json
{
  "message": "Proveedor creado exitosamente",
  "proveedor": {
    "id_proveedor": 123,
    "nom_empresa_proveedor": "DJ Sonido Master",
    "categoria_proveedor": "Música",
    "id_tipo": 4,
    "id_plan": 2,
    "precio_base": 500000,
    "estado_aprobacion": "pendiente",
    "fecha_registro": "2025-01-03T10:30:00Z"
  }
}
```

---

## 3. Crear Proveedor Música SIN Horas

```bash
curl -X POST http://localhost:3000/api/proveedor \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "nom_empresa_proveedor=DJ Clásica Eventos" \
  -F "categoria_proveedor=Música" \
  -F "genero=Clásico" \
  -F "precio=350000" \
  -F "id_plan=1"
```

**Resultado esperado**:
- ✅ El proveedor se crea exitosamente
- ❌ NO falla por falta de horaInicio/horaFin (antes sí fallaba)
- ⚠️ No se crea característica "Horas de música" (porque no se envió)

---

## 4. Verificar Datos en la BD

### Query: Obtener proveedor recién creado con características

```sql
-- Opción A: Ver características de un proveedor específico
SELECT 
    p.id_proveedor,
    p.nom_empresa_proveedor,
    c.nombre AS caracteristica_nombre,
    pc.valor_texto,
    pc.valor_numero,
    pc.updated_at
FROM proveedor p
LEFT JOIN proveedor_caracteristica pc 
    ON p.id_proveedor = pc.id_proveedor
LEFT JOIN caracteristica c 
    ON pc.id_caracteristica = c.id_caracteristica
WHERE p.id_proveedor = 123
ORDER BY c.nombre;
```

**Resultado esperado** (para el proveedor que enviamos horas):
```
id_proveedor | nom_empresa_proveedor  | caracteristica_nombre | valor_texto      | valor_numero | updated_at
123          | DJ Sonido Master       | Horas de música       | 19:00 - 06:00    | NULL         | 2025-01-03...
```

### Query: Listar todos los proveedores de música con sus horas

```sql
SELECT 
    p.id_proveedor,
    p.nom_empresa_proveedor,
    pt.nombre AS tipo_proveedor,
    pc_horas.valor_texto AS horas_musica,
    pc_horas.updated_at
FROM proveedor p
JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
LEFT JOIN proveedor_caracteristica pc_horas
    ON p.id_proveedor = pc_horas.id_proveedor
    AND pc_horas.id_caracteristica = 7  -- id de "Horas de música"
WHERE pt.nombre ILIKE '%música%'
ORDER BY p.id_proveedor DESC;
```

---

## 5. Actualizar Horas de un Proveedor Existente

```bash
curl -X PUT http://localhost:3000/api/proveedor/123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "horas_musica": "20:00 - 05:00"
  }'
```

**Resultado esperado**:
- ✅ Se actualiza la característica "Horas de música"
- Si no existía, se crea (UPSERT)
- Si ya existía, se sobrescribe el valor

**Verificar** (query de arriba debería mostrar el nuevo valor):
```sql
SELECT valor_texto 
FROM proveedor_caracteristica 
WHERE id_proveedor = 123 AND id_caracteristica = 7;
```

---

## 6. Obtener Proveedor con sus Características (Endpoint)

Si existe endpoint `GET /proveedor/:id/with-caracteristicas`:

```bash
curl -X GET http://localhost:3000/api/proveedor/with-caracteristicas/123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Respuesta esperada**:
```json
{
  "id_proveedor": 123,
  "nom_empresa_proveedor": "DJ Sonido Master",
  "genero": "Reggaeton",
  "por_hora": true,
  "precio_base": 500000,
  "horas_musica": "19:00 - 06:00",
  "tipo_nombre": "Música",
  "id_plan": 2,
  "nombre_plan": "Medio",
  "estado_aprobacion": "pendiente"
}
```

---

## 7. Probar Eliminación

```bash
curl -X DELETE http://localhost:3000/api/proveedor/123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Resultado esperado**:
- ✅ El proveedor se elimina
- ✅ Sus características en `proveedor_caracteristica` también se eliminan
- ✅ No hay errores de FK constraint

---

## ✅ Checklist de Validación

- [ ] Crear música CON horas - ✅ funciona
- [ ] Crear música SIN horas - ✅ funciona (antes fallaba)
- [ ] Ver características en BD - ✅ valor_texto = "HH:MM - HH:MM"
- [ ] Actualizar horas - ✅ usa ON CONFLICT para UPSERT
- [ ] Eliminar proveedor - ✅ elimina también características
- [ ] No hay errores en consola del backend
- [ ] id_caracteristica = 7 coincide con "Horas de música"

---

## 🔧 Troubleshooting

### Error: "Característica no encontrada"
**Causa**: id_caracteristica 7 no existe en la BD
**Solución**: Ejecutar:
```sql
INSERT INTO caracteristica (id_caracteristica, nombre, tipo_valor)
VALUES (7, 'Horas de música', 'texto');
```

### Error: "no existe la relación «proveedor_caracteristica»"
**Causa**: Tabla no existe
**Solución**: Verificar que la tabla existe:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'proveedor_caracteristica';
```

### El valor no se guarda en la BD
**Causa**: `data.horas_musica` puede ser undefined
**Solución**: Verificar que el controlador asigna correctamente:
```javascript
if (horaInicioParsed !== null || horaFinParsed !== null) {
    proveedorData.horas_musica = `${horaInicioParsed || 0}:00 - ${horaFinParsed || 23}:00`;
}
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|----------|-----------|
| Crear música CON horas | ✅ Funciona | ✅ Funciona |
| Crear música SIN horas | ❌ Falla | ✅ Funciona |
| Validación de horas | Requeridas | Opcionales |
| Tabla utilizada | `proveedor_musica` (no existe) | `proveedor_caracteristica` (existe) |
| id_caracteristica | N/A | 7 |
| Formato almacenado | N/A | "19:00 - 06:00" |
| Migración SQL necesaria | Sí (crear tabla) | No |
| Escalabilidad | Limitada | Flexible |

