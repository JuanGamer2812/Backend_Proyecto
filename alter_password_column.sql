-- Ampliar columna de contraseña para soportar bcrypt hash (60 caracteres)
ALTER TABLE usuario ALTER COLUMN "contraseña_usuario" TYPE VARCHAR(255);
