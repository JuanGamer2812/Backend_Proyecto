-- Migración 002: Tabla de tokens de reset de contraseña
-- Fecha: 2025-01-22
-- Descripción: Tabla para almacenar y rastrear tokens de recuperación de contraseña

-- Tabla de tokens de reset de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    ip_address VARCHAR(45) NULL,  -- Para tracking de seguridad
    user_agent TEXT NULL           -- Para tracking de seguridad
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
    ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
    ON password_reset_tokens(expires_at);

-- Índice para limpiar tokens expirados fácilmente
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_cleanup 
    ON password_reset_tokens(expires_at, used);

-- Trigger para actualizar used_at cuando se marca como usado
CREATE OR REPLACE FUNCTION update_password_reset_used_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.used = true AND OLD.used = false THEN
        NEW.used_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_password_reset_used_at
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_password_reset_used_at();

-- Función para limpiar tokens expirados automáticamente (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    RAISE NOTICE 'Tokens de reset expirados limpiados';
END;
$$ LANGUAGE plpgsql;

-- Vista para estadísticas de reset de contraseñas
CREATE OR REPLACE VIEW v_password_reset_stats AS
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as total_solicitudes,
    COUNT(CASE WHEN used = true THEN 1 END) as tokens_utilizados,
    COUNT(CASE WHEN used = false AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as tokens_activos,
    COUNT(CASE WHEN used = false AND expires_at < CURRENT_TIMESTAMP THEN 1 END) as tokens_expirados
FROM password_reset_tokens
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Comentarios
COMMENT ON TABLE password_reset_tokens IS 'Almacena tokens de recuperación de contraseña con tracking de uso';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token JWT de reset (único y con expiración)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indica si el token ya fue utilizado';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Fecha de expiración del token (típicamente 1 hora)';

-- Datos de ejemplo (opcional, para testing)
-- INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
-- VALUES (1, 'ejemplo_token_jwt', CURRENT_TIMESTAMP + INTERVAL '1 hour', false);

RAISE NOTICE 'Migración 002: Tabla password_reset_tokens creada exitosamente';
