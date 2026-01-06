-- Metodo alternativo: agregar nueva columna, copiar datos, eliminar antigua
ALTER TABLE usuario ADD COLUMN telefono_usuario_nuevo VARCHAR(20);
UPDATE usuario SET telefono_usuario_nuevo = telefono_usuario;
ALTER TABLE usuario DROP COLUMN telefono_usuario;
ALTER TABLE usuario RENAME COLUMN telefono_usuario_nuevo TO telefono_usuario;
