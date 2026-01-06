# Sistema de Insertar Proveedores - Documentación

## Endpoints Implementados

### 1. GET /api/categorias
Obtiene todas las categorías disponibles para los proveedores.

**Método:** `GET`  
**URL:** `/api/categorias`  
**Autenticación:** No requerida (público)

#### Respuesta Exitosa (200)
```json
[
    {
        "id_categoria": 1,
        "nombre": "catering",
        "descripcion": "Servicios de catering"
    },
    {
        "id_categoria": 2,
        "nombre": "fotografia",
        "descripcion": "Servicios de fotografía"
    }
]
```

---

### 2. GET /api/planes
Obtiene todos los planes disponibles para los proveedores.

**Método:** `GET`  
**URL:** `/api/planes`  
**Autenticación:** No requerida (público)

#### Respuesta Exitosa (200)
```json
[
    {
        "id_plan": 1,
        "nombre_plan": "Plan Básico",
        "descripcion": "Acceso básico a funcionalidades",
        "precio": 0,
        "caracteristicas": ["Perfil básico", "5 fotos"]
    },
    {
        "id_plan": 2,
        "nombre_plan": "Plan Premium",
        "descripcion": "Acceso completo",
        "precio": 99.99,
        "caracteristicas": ["Perfil destacado", "Fotos ilimitadas", "Soporte prioritario"]
    }
]
```

---

### 3. POST /api/trabaja_nosotros_proveedor
Crea una nueva solicitud de proveedor con soporte para archivos adjuntos.

**Método:** `POST`  
**URL:** `/api/trabaja_nosotros_proveedor`  
**Content-Type:** `multipart/form-data`  
**Autenticación:** No requerida (público)

#### Parámetros (FormData)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `categoria` | string | Sí | Categoría del proveedor. Valores válidos: `catering`, `fotografia`, `musica`, `decoracion`, `transporte`, `floristeria`, `animacion` |
| `empresa` | string | Sí | Nombre de la empresa (3-100 caracteres) |
| `email` | string | Sí | Email válido del proveedor |
| `portafolio` | string | No | URL del portafolio (opcional) |
| `archivos` | File[] | No | Archivos adjuntos (máximo 5, 50MB cada uno) |

#### Tipos de Archivo Permitidos
- PDF (`.pdf`)
- Imágenes: JPG (`.jpg`, `.jpeg`), PNG (`.png`), GIF (`.gif`), WEBP (`.webp`)

#### Límites
- **Máximo de archivos:** 5
- **Tamaño máximo por archivo:** 50 MB
- **Tamaño total máximo:** 250 MB (5 archivos × 50 MB)

#### Validaciones

1. **Categoría:**
   - Debe ser una de las siguientes: `catering`, `fotografia`, `musica`, `decoracion`, `transporte`, `floristeria`, `animacion`
   
2. **Nombre de Empresa:**
   - Mínimo 3 caracteres
   - Máximo 100 caracteres
   
3. **Email:**
   - Formato de email válido (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

4. **Archivos:**
   - Solo tipos permitidos: PDF, JPG, PNG, GIF, WEBP
   - Máximo 50 MB por archivo
   - Máximo 5 archivos

#### Respuesta Exitosa (201)
```json
{
    "success": true,
    "message": "Solicitud enviada correctamente",
    "id_postu_proveedor": 123,
    "data": {
        "categoria": "fotografia",
        "empresa": "Fotografía Profesional S.A.",
        "email": "contacto@fotografia.com",
        "portafolio": "https://www.miweb.com/portafolio",
        "fecha": "2025-01-15T10:30:00.000Z"
    },
    "archivos": [
        {
            "nombre": "portafolio.pdf",
            "tipo": "application/pdf",
            "tamanio": 2048576,
            "url": "/tmp_uploads/1642248600000-123456789.pdf"
        },
        {
            "nombre": "foto1.jpg",
            "tipo": "image/jpeg",
            "tamanio": 1024000,
            "url": "/tmp_uploads/1642248600001-987654321.jpg"
        }
    ]
}
```

#### Respuesta de Error (400)
```json
{
    "success": false,
    "message": "Categoría no válida"
}
```

```json
{
    "success": false,
    "message": "El nombre de la empresa debe tener entre 3 y 100 caracteres"
}
```

```json
{
    "success": false,
    "message": "Email no válido"
}
```

#### Respuesta de Error (500)
```json
{
    "success": false,
    "message": "Error al procesar la solicitud",
    "error": "Detalle del error"
}
```

---

## Ejemplo de Uso (JavaScript/TypeScript)

### Ejemplo con Fetch API

```javascript
async function enviarSolicitudProveedor() {
    const formData = new FormData();
    
    // Agregar campos de texto
    formData.append('categoria', 'fotografia');
    formData.append('empresa', 'Fotografía Profesional S.A.');
    formData.append('email', 'contacto@fotografia.com');
    formData.append('portafolio', 'https://www.miweb.com/portafolio');
    
    // Agregar archivos (desde input file)
    const fileInput = document.querySelector('#archivos');
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('archivos', fileInput.files[i]);
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/trabaja_nosotros_proveedor', {
            method: 'POST',
            body: formData
            // NO incluir Content-Type header, el navegador lo agrega automáticamente
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Solicitud enviada:', data.id_postu_proveedor);
            console.log('Archivos subidos:', data.archivos);
        } else {
            console.error('❌ Error:', data.message);
        }
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}
```

### Ejemplo con Angular HttpClient

```typescript
import { HttpClient } from '@angular/common/http';

export class ProveedorService {
    constructor(private http: HttpClient) {}
    
    enviarSolicitud(categoria: string, empresa: string, email: string, portafolio: string, archivos: File[]) {
        const formData = new FormData();
        formData.append('categoria', categoria);
        formData.append('empresa', empresa);
        formData.append('email', email);
        formData.append('portafolio', portafolio);
        
        // Agregar múltiples archivos
        archivos.forEach(archivo => {
            formData.append('archivos', archivo);
        });
        
        return this.http.post('http://localhost:5000/api/trabaja_nosotros_proveedor', formData);
    }
}
```

---

## Estructura de Base de Datos

### Tabla: `trabaja_nosotros_proveedor`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_postu_proveedor` | SERIAL | ID único de la solicitud (PK) |
| `categoria_postu_proveedor` | VARCHAR | Categoría del proveedor |
| `nom_empresa_postu_proveedor` | VARCHAR | Nombre de la empresa |
| `correo_postu_proveedor` | VARCHAR | Email del proveedor |
| `portafolio_postu_proveedor` | VARCHAR | URL del portafolio (nullable) |
| `archivos_paths` | JSONB | Array de rutas de archivos (nullable) |
| `fecha_postu_proveedor` | TIMESTAMP | Fecha de la solicitud |

### Ejemplo de `archivos_paths` (JSONB)
```json
[
    "/tmp_uploads/1642248600000-123456789.pdf",
    "/tmp_uploads/1642248600001-987654321.jpg"
]
```

---

## Archivos Modificados/Creados

### Nuevos Archivos

1. **src/routes/plan.routes.js** - Rutas de planes
2. **src/controllers/plan.controller.js** - Controlador de planes
3. **src/services/plan.service.js** - Servicio de planes
4. **src/models/plan.models.js** - Modelo de planes
5. **migrations/009_add_archivos_paths_column.sql** - Migración de columna
6. **add_archivos_paths_column.js** - Script de migración

### Archivos Modificados

1. **src/app.js** - Registro de rutas de planes y directorio tmp_uploads
2. **src/routes/trabaja_nosotros_proveedor.routes.js** - Agregado middleware multer
3. **src/controllers/trabaja_nosotros_proveedor.controller.js** - Validaciones y manejo de archivos
4. **src/models/trabaja_nosotros_proveedor.models.js** - Soporte para archivos_paths

---

## Notas Técnicas

1. **Multer Configuration:**
   - Storage: Disk storage en `/tmp_uploads`
   - Naming: `timestamp-random.extension`
   - File filter: Solo tipos permitidos

2. **Validaciones Backend:**
   - Categorías enum-based
   - Email regex pattern
   - Longitud de nombre de empresa
   - Tipos y tamaños de archivo

3. **Seguridad:**
   - Validación de tipos MIME y extensiones
   - Límite de tamaño por archivo (50MB)
   - Límite de cantidad de archivos (5)
   - Sanitización de nombres de archivo

4. **Acceso a Archivos:**
   - Los archivos se sirven estáticamente desde `/tmp_uploads`
   - URL base: `http://localhost:5000/tmp_uploads/filename`

---

## Estado de Implementación

✅ **Completado:**
- GET /api/categorias
- GET /api/planes
- POST /api/trabaja_nosotros_proveedor (con multipart/form-data)
- Validaciones de campos
- Manejo de archivos con multer
- Migración de base de datos
- Directorio tmp_uploads creado y servido

✅ **Funcional:**
- Servidor corriendo en http://localhost:5000
- Todos los endpoints accesibles
- Base de datos actualizada
