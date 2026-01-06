# 📊 FLUJO DE DATOS - OPCIÓN 2: Característica "Horas de Música"

## Antes ❌
```
Frontend POST /api/proveedor
    ↓
    {
        categoria: "Música",
        genero: "Reggaeton",
        horaInicio: 19,
        horaFin: 06
    }
    ↓
Controlador valida horaInicio y horaFin (requeridos)
    ↓
Modelo intenta INSERT en tabla "proveedor_musica"
    ↓
❌ ERROR: "no existe la relación «proveedor_musica»"
```

---

## Ahora ✅
```
Frontend POST /api/proveedor
    ↓
    {
        categoria: "Música",
        genero: "Reggaeton",
        horaInicio: 19,
        horaFin: 06
    }
    ↓
Controlador genera: proveedorData.horas_musica = "19:00 - 06:00"
    ↓
Modelo INSERT en proveedor (tabla existe ✅)
    ↓
Modelo INSERT en proveedor_caracteristica con id_caracteristica=7 (tabla existe ✅)
    ↓
✅ ÉXITO: Proveedor creado con características
```

---

## 📦 Base de Datos

### Tabla: proveedor
```sql
┌──────────────────────────────────────┐
│         PROVEEDOR (existe ✅)        │
├──────────────────────────────────────┤
│ id_proveedor      | INTEGER PK       │
│ nom_empresa       | VARCHAR          │
│ id_tipo           | INTEGER FK       │
│ id_plan           | INTEGER FK       │
│ precio_base       | DECIMAL          │
│ descripcion       | TEXT             │
│ estado_aprobacion | VARCHAR          │
│ fecha_registro    | TIMESTAMP        │
└──────────────────────────────────────┘
```

### Tabla: proveedor_caracteristica
```sql
┌────────────────────────────────────────┐
│ PROVEEDOR_CARACTERISTICA (existe ✅)  │
├────────────────────────────────────────┤
│ id_proveedor      | INTEGER FK        │
│ id_caracteristica | INTEGER FK        │
│ valor_texto       | VARCHAR  ← HORAS  │
│ valor_numero      | NUMERIC           │
│ valor_booleano    | BOOLEAN           │
│ valor_json        | JSONB             │
│ updated_at        | TIMESTAMP         │
│ PK: (id_proveedor, id_caracteristica) │
└────────────────────────────────────────┘
```

### Tabla: caracteristica
```sql
┌──────────────────────────────────────┐
│     CARACTERISTICA (existe ✅)       │
├──────────────────────────────────────┤
│ id_caracteristica | INTEGER PK       │
│ nombre            | VARCHAR          │
│ tipo_valor        | VARCHAR          │
└──────────────────────────────────────┘

REGISTROS RELEVANTES:
- id=7: "Horas de música" (tipo_valor: texto)
- id=3: "Tipo de menú"
- id=4: "Incluye bebidas"
...
```

---

## 🔄 Flujo Completo de Creación

```
1️⃣ POST /api/proveedor
   └─ horaInicio=19, horaFin=06

2️⃣ Controlador procesa:
   └─ proveedorData.horas_musica = "19:00 - 06:00"

3️⃣ Modelo.create() comienza TRANSACCIÓN
   ├─ INSERT INTO proveedor
   │  └─ nom_empresa_proveedor, id_tipo, id_plan, etc.
   │  └─ Retorna: id_proveedor = 123
   │
   └─ if (categoria === 'musica')
      └─ INSERT INTO proveedor_caracteristica
         ├─ id_proveedor = 123
         ├─ id_caracteristica = 7
         ├─ valor_texto = "19:00 - 06:00"
         └─ updated_at = NOW()
         
         ON CONFLICT (id_proveedor, id_caracteristica)
         DO UPDATE SET valor_texto = ...

4️⃣ COMMIT TRANSACCIÓN
   └─ Proveedor creado exitosamente

5️⃣ Response: { id_proveedor: 123, nombre: "DJ...", ... }
```

---

## 🔍 Lectura de Datos

### Obtener proveedor de música con sus horas

**SQL**:
```sql
SELECT 
    p.id_proveedor,
    p.nom_empresa_proveedor,
    pc.valor_texto AS horas_musica
FROM proveedor p
LEFT JOIN proveedor_caracteristica pc 
    ON p.id_proveedor = pc.id_proveedor 
    AND pc.id_caracteristica = 7
WHERE p.id_proveedor = 123;
```

**Resultado**:
```
┌─────────────────┬──────────────────────┬────────────────────┐
│ id_proveedor    │ nom_empresa_proveedor│ horas_musica       │
├─────────────────┼──────────────────────┼────────────────────┤
│ 123             │ DJ Sonido Master     │ 19:00 - 06:00      │
└─────────────────┴──────────────────────┴────────────────────┘
```

---

## 🎯 Casos de Uso

### Caso 1: Crear Música CON horas
```javascript
POST /api/proveedor
{
    nom_empresa: "DJ Party",
    categoria: "Música",
    genero: "Reggaeton",
    precio: 500000,
    horaInicio: 19,     // Opcional
    horaFin: 06,        // Opcional
    id_plan: 2
}

→ Se crea con características
```

### Caso 2: Crear Música SIN horas
```javascript
POST /api/proveedor
{
    nom_empresa: "DJ Clásica",
    categoria: "Música",
    genero: "Clásico",
    precio: 300000,
    // sin horaInicio/horaFin
    id_plan: 1
}

→ Se crea sin características
```

### Caso 3: Actualizar horas
```javascript
PUT /api/proveedor/123
{
    horas_musica: "20:00 - 05:00"  // Actualiza característica
}

→ Se actualiza con ON CONFLICT
```

---

## 📝 Notas Importantes

✅ **Validaciones eliminadas**:
- `horaInicio` y `horaFin` ya NO son requeridos
- `horaFin` NO necesita ser > `horaInicio`

✅ **Ahora es flexible**:
- Proveedor de música sin horas definidas funciona correctamente
- Horas se pueden agregar/actualizar en cualquier momento

✅ **Escalabilidad**:
- Cualquier proveedor puede tener características adicionales sin cambiar schema
- Sistema es extensible para nuevas características

✅ **Consistencia**:
- Sigue el mismo patrón que Catering (tipo_comida), Lugar (capacidad), etc.
- Usa infraestructura ya establecida en la BD
