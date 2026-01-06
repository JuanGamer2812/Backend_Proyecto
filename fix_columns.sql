-- Ampliar columna de telefono para soportar numeros mas largos
ALTER TABLE usuario ALTER COLUMN telefono_usuario TYPE VARCHAR(20);

-- Ampliar campo de genero por si acaso
ALTER TABLE usuario ALTER COLUMN genero_usuario TYPE VARCHAR(50);
