-- Paso 1: Eliminar vistas que usan la columna telefono_usuario
DROP VIEW IF EXISTS v_usuario CASCADE;
DROP VIEW IF EXISTS v_usuario_rol CASCADE;

-- Paso 2: Modificar las columnas
ALTER TABLE usuario ALTER COLUMN telefono_usuario TYPE VARCHAR(20);
ALTER TABLE usuario ALTER COLUMN genero_usuario TYPE VARCHAR(50);

-- Paso 3: Recrear la vista v_usuario_rol (si existe)
CREATE OR REPLACE VIEW v_usuario_rol AS
SELECT 
    u.id_usuario,
    u.nombre_usuario,
    u.apellido_usuario,
    u.genero_usuario,
    u.fecha_nacimiento_usuario,
    u.correo_usuario,
    u.telefono_usuario,
    u.foto_url,
    u.fecha_registro_usuario,
    u.estado_usuario,
    r.id_rol,
    r.nombre_rol,
    r.descripcion_rol
FROM usuario u
LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
LEFT JOIN rol r ON ur.id_rol = r.id_rol;

-- Recrear v_usuario si es necesaria
CREATE OR REPLACE VIEW v_usuario AS
SELECT 
    id_usuario,
    nombre_usuario,
    apellido_usuario,
    genero_usuario,
    fecha_nacimiento_usuario,
    correo_usuario,
    telefono_usuario,
    foto_url,
    fecha_registro_usuario,
    estado_usuario,
    rol
FROM usuario;
