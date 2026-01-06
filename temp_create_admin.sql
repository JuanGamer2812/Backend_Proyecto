-- Crear usuario administrador
INSERT INTO usuario (
    nombre_usuario, 
    apellido_usuario, 
    genero_usuario, 
    fecha_nacimiento_usuario, 
    "contraseña_usuario", 
    correo_usuario, 
    telefono_usuario, 
    fecha_registro_usuario, 
    estado_usuario, 
    rol
) VALUES (
    'Admin', 
    'Sistema', 
    'Masculino', 
    '1990-01-01', 
    'admin123', 
    'admin@gmail.com', 
    '1234567890', 
    CURRENT_DATE, 
    true, 
    'admin'
) ON CONFLICT (correo_usuario) DO UPDATE 
SET rol = 'admin'
RETURNING id_usuario, nombre_usuario, correo_usuario, rol;
