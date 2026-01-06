# Endpoint POST /api/proveedor - Crear Nuevo Proveedor

## Descripción
Endpoint para crear un nuevo proveedor con soporte multipart/form-data. Acepta datos generales y específicos según la categoría (Música, Catering, Lugar, Decoración).

## URL
```
POST http://localhost:5000/api/proveedor
```

## Headers
```
Content-Type: multipart/form-data
```

## Request Body (FormData)

### Campos Generales (requeridos)
- `nom_empresa_proveedor` (string) - Nombre de la empresa
- `categoria_proveedor` (string) - Categoría: "Música", "Catering", "Lugar", "Decoración"
- `descripcion` (string, opcional) - Descripción general
- `plan` (string, opcional) - Plan de servicio

### Campos por Categoría

#### Música
```
- genero (string, requerido) - Género musical
- precio (number, requerido) - Precio base
- porHora (boolean, opcional) - ¿Cobra por hora?
- horaInicio (number, opcional) - Hora inicio (0-23) - Se guarda en característica "Horas de música"
- horaFin (number, opcional) - Hora fin (0-23) - Se guarda en característica "Horas de música"
- imagen (file, optional) - Imagen JPG/PNG/WEBP (max 10MB)
```

#### Catering
```
- tipoComida (string, requerido) - Tipo de comida
- precioPersona (number, requerido) - Precio por persona
- menuFile (file, requerido) - Menú en PDF (max 10MB)
```

#### Lugar
```
- capacidad (number, requerido) - Capacidad máxima
- precio (number, requerido) - Precio del lugar
- direccion (string, requerido) - Dirección del lugar
- seguridad (string, opcional) - Datos de seguridad
- imagen1, imagen2, imagen3 (file, opcional) - Imágenes JPG/PNG/WEBP (max 10MB c/u)
```

#### Decoración
```
- nivel (string, requerido) - Nivel de detalle
- tipo (string, requerido) - Tipo de decoración
- precio (number, requerido) - Precio de decoración
- catalogoFile (file, requerido) - Catálogo en PDF (max 10MB)
- logoFile (file, requerido) - Logo imagen JPG/PNG/WEBP (max 10MB)
```

## Ejemplo de Request (JavaScript)

```javascript
const formData = new FormData();

// Datos generales
formData.append('nom_empresa_proveedor', 'DJ Elite');
formData.append('categoria_proveedor', 'Música');
formData.append('descripcion', 'Servicio de DJ profesional');
formData.append('plan', 'Premium');

// Datos específicos de Música
formData.append('genero', 'Pop/Rock');
formData.append('precio', '500');
formData.append('porHora', 'false');
formData.append('horaInicio', '18');
formData.append('horaFin', '23');

// Archivo (opcional)
const imagenInput = document.getElementById('imagen');
if (imagenInput.files.length > 0) {
    formData.append('imagen', imagenInput.files[0]);
}

// Enviar
fetch('http://localhost:5000/api/proveedor', {
    method: 'POST',
    body: formData
})
.then(res => res.json())
.then(data => console.log('Proveedor creado:', data))
.catch(err => console.error('Error:', err));
```

## Validaciones

### Validaciones Generales
- ✅ `nom_empresa_proveedor` - requerido, no vacío
- ✅ `categoria_proveedor` - requerido, debe ser válida
- ✅ `precio` - debe ser número > 0

### Validaciones por Categoría

**Música:**
- ✅ `genero` - requerido
- ✅ `horaInicio` y `horaFin` - opcionales, se guardan en característica "Horas de música" (id_caracteristica 7)

**Catering:**
- ✅ `tipoComida` - requerido
- ✅ `precioPersona` - requerido, > 0
- ✅ `menuFile` - requerido, debe ser PDF

**Lugar:**
- ✅ `capacidad` - requerido, > 0
- ✅ `precio` - requerido, > 0
- ✅ `direccion` - requerido
- ✅ Imágenes opcionales: JPG, PNG, WEBP

**Decoración:**
- ✅ `nivel` - requerido
- ✅ `tipo` - requerido
- ✅ `precio` - requerido, > 0
- ✅ `catalogoFile` - requerido, debe ser PDF
- ✅ `logoFile` - requerido, debe ser imagen

### Validaciones de Archivo
- ✅ Tamaño máximo: 10MB por archivo
- ✅ Imágenes permitidas: JPG, PNG, WEBP
- ✅ PDFs permitidos: application/pdf

## Response (201 Created)

```json
{
  "message": "Proveedor creado exitosamente",
  "proveedor": {
    "id_proveedor": 123,
    "nombre": "DJ Elite",
    "precio_base": 500,
    "estado": "activo",
    "descripcion": "Servicio de DJ profesional",
    "estado_aprobacion": "pendiente",
    "razon_rechazo": null,
    "verificado": false,
    "aprobado_por": null
  }
}
```

## Response Errors

### 400 Bad Request
```json
{
  "message": "nom_empresa_proveedor es requerido"
}
```

Mensajes de error posibles:
- "nom_empresa_proveedor es requerido"
- "categoria_proveedor es requerido"
- "categoria_proveedor inválida. Debe ser uno de: ..."
- "genero es requerido (Música)"
- "precio debe ser un número mayor a 0"
- "tipoComida es requerido (Catering)"
- "menuFile (PDF) es requerido (Catering)"
- "menuFile debe ser un archivo PDF"
- "capacidad debe ser un número mayor a 0"
- "direccion es requerida (Lugar)"
- "nivel es requerido (Decoración)"
- "catalogoFile (PDF) es requerido (Decoración)"
- "logoFile (imagen) es requerido (Decoración)"
- "logoFile debe ser JPG, PNG o WEBP"

### 500 Internal Server Error
```json
{
  "message": "Error al crear el proveedor",
  "error": "Descripción del error"
}
```

## Estados Iniciales

Todo proveedor creado tiene:
- `verificado`: false
- `estado_aprobacion`: 'pendiente'
- `razon_rechazo`: null
- `aprobado_por`: null

## Archivos Guardados

Los archivos se guardan en:
```
/public/uploads/
```

Las URLs relativas son devueltas en las respuestas como:
- `imagen_url`
- `menu_url`
- `catalogo_url`
- `logo_url`
- `imagen1_url`, `imagen2_url`, `imagen3_url`

Para acceder a los archivos:
```
http://localhost:5000/uploads/{nombre_archivo}
```

## Notas Importantes

1. **Sin autenticación**: El endpoint POST es público (sin requerimiento de token)
2. **Tabla principal**: Los datos se insertan en `proveedor`
3. **Tablas específicas**: Se crean registros en `proveedor_musica`, `proveedor_catering`, `proveedor_lugar` o `proveedor_decoracion` según categoría
4. **Transacciones**: Usa transacciones PostgreSQL (BEGIN/COMMIT) para consistencia
5. **Manejo de archivos**: Multer maneja el almacenamiento con nombres únicos (timestamp + random)
