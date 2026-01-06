# Endpoints del Sistema - Categorías, Proveedores y Reservas

## 📋 Resumen de Endpoints Creados

### ✅ 1. Categorías (`/api/categorias`)

#### GET /api/categorias
Obtiene todas las categorías activas de proveedores.

**Respuesta:**
```json
[
  {
    "id_categoria": 1,
    "nombre": "Música",
    "icono": "bi-music-note-beamed",
    "activo": true
  },
  {
    "id_categoria": 2,
    "nombre": "Catering",
    "icono": "bi-egg-fried",
    "activo": true
  }
]
```

---

### ✅ 2. Proveedores (`/api/proveedor`)

#### GET /api/proveedor?estado=aprobado
Obtiene proveedores filtrados por estado.

**Ejemplo:**
```bash
GET http://localhost:443/api/proveedor?estado=aprobado
```

**Respuesta:**
```json
[
  {
    "id_proveedor": 1,
    "nombre": "DJ Fiesta Pro",
    "categoria": "Música",
    "descripcion": "DJ profesional con 10 años de experiencia",
    "precio_base": 500.00,
    "estado": "aprobado",
    "tipo_nombre": "Música"
  }
]
```

#### GET /api/proveedor/categoria/:categoria
Obtiene proveedores de una categoría específica (solo aprobados).

**Ejemplo:**
```bash
GET http://localhost:443/api/proveedor/categoria/Música
```

**Respuesta:**
```json
[
  {
    "id_proveedor": 1,
    "nombre": "DJ Fiesta Pro",
    "categoria": "Música",
    "precio_base": 500.00,
    "estado": "aprobado"
  }
]
```

---

### ✅ 3. Reservas (`/api/reservas`)

#### POST /api/reservas
Crea una nueva reserva de evento con proveedores.

**Body:**
```json
{
  "id_usuario": 123,
  "nombreEvento": "Boda Camila & Diego",
  "tipoEvento": "Boda",
  "descripcion": "Celebración de nuestra boda en jardín",
  "fechaInicio": "2025-12-25T19:00:00",
  "fechaFin": "2025-12-26T02:00:00",
  "precioBase": 1000.00,
  "hayPlaylist": true,
  "playlist": "https://spotify.com/playlist/xyz",
  "proveedoresSeleccionados": [
    {
      "categoria": "Música",
      "id_proveedor": 1,
      "plan": "Plus",
      "horaInicio": "20:00",
      "horaFin": "01:00",
      "notasAdicionales": "Preferencia por música latina"
    },
    {
      "categoria": "Catering",
      "id_proveedor": 2,
      "plan": "Estelar",
      "horaInicio": "19:30",
      "horaFin": "23:00",
      "notasAdicionales": "Menu vegetariano incluido"
    }
  ],
  "estado": "pendiente"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Reserva creada exitosamente",
  "data": {
    "id_reserva": 456,
    "id_usuario": 123,
    "nombreEvento": "Boda Camila & Diego",
    "estado": "pendiente",
    "fecha_creacion": "2025-12-23T10:30:00Z",
    "total_estimado": "2750.00",
    "proveedores_contratados": [...]
  }
}
```

#### GET /api/reservas/:id
Obtiene una reserva por ID con todos sus proveedores.

#### GET /api/reservas/usuario/:id
Obtiene todas las reservas de un usuario específico.

#### GET /api/reservas
Obtiene todas las reservas (admin).

#### PATCH /api/reservas/:id/estado
Actualiza el estado de una reserva.

**Body:**
```json
{
  "estado": "confirmado"
}
```

Estados válidos: `pendiente`, `confirmado`, `cancelado`, `completado`

---

## 🗄️ Estructura de Base de Datos

### Tabla: `categoria`
```sql
CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `proveedor` (columnas agregadas)
```sql
ALTER TABLE proveedor ADD COLUMN categoria VARCHAR(50);
ALTER TABLE proveedor ADD COLUMN estado VARCHAR(20) DEFAULT 'pendiente';
```

### Tabla: `reserva`
```sql
CREATE TABLE reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    nombre_evento VARCHAR(100) NOT NULL,
    tipo_evento VARCHAR(100),
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    precio_base DECIMAL(10,2),
    hay_playlist BOOLEAN DEFAULT FALSE,
    playlist VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);
```

### Tabla: `reserva_proveedor`
```sql
CREATE TABLE reserva_proveedor (
    id SERIAL PRIMARY KEY,
    id_reserva INTEGER NOT NULL,
    id_proveedor INTEGER NOT NULL,
    categoria VARCHAR(50),
    plan VARCHAR(20),
    hora_inicio TIME,
    hora_fin TIME,
    notas_adicionales TEXT,
    precio_acordado DECIMAL(10,2),
    FOREIGN KEY (id_reserva) REFERENCES reserva(id_reserva),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
);
```

---

## 🚀 Instalación y Ejecución

### 1. Aplicar Migración SQL
```bash
# Conectarse a PostgreSQL
psql -U postgres -d eclat

# Ejecutar migración
\i migrations/007_categorias_reservas.sql
```

### 2. Reiniciar Backend
```bash
node index.js
```

---

## 📝 Archivos Creados

### Modelos
- `src/models/categoria.models.js`
- `src/models/reserva.models.js`
- `src/models/proveedor.models.js` (actualizado)

### Controladores
- `src/controllers/categoria.controller.js`
- `src/controllers/reserva.controller.js`
- `src/controllers/proveedor.controller.js` (actualizado)

### Servicios
- `src/services/proveedor.service.js` (actualizado)

### Rutas
- `src/routes/categoria.routes.js`
- `src/routes/reserva.routes.js`
- `src/routes/proveedor.routes.js` (actualizado)

### Migraciones
- `migrations/007_categorias_reservas.sql`

### Configuración
- `src/app.js` (actualizado con nuevas rutas)

---

## 🧪 Pruebas con PowerShell

### Obtener categorías
```powershell
Invoke-RestMethod -Uri "http://localhost:443/api/categorias" -Method Get
```

### Obtener proveedores aprobados
```powershell
Invoke-RestMethod -Uri "http://localhost:443/api/proveedor?estado=aprobado" -Method Get
```

### Obtener proveedores por categoría
```powershell
Invoke-RestMethod -Uri "http://localhost:443/api/proveedor/categoria/Música" -Method Get
```

### Crear reserva
```powershell
$body = @{
    id_usuario = 1
    nombreEvento = "Mi Evento"
    fechaInicio = "2025-12-25T19:00:00"
    fechaFin = "2025-12-25T23:00:00"
    proveedoresSeleccionados = @(
        @{
            id_proveedor = 1
            categoria = "Música"
            plan = "Plus"
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:443/api/reservas" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## ✅ Estado de Implementación

- [x] Migración SQL creada
- [x] Modelos creados
- [x] Controladores creados
- [x] Rutas configuradas
- [x] Integración en app.js
- [x] Documentación completa

**Todos los endpoints solicitados han sido implementados y están listos para usar.**
