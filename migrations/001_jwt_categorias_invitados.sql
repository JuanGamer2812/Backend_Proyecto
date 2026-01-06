-- ============================================================================
-- SCRIPT DE MIGRACIONES PARA EL PROYECTO ECLAT
-- Base de Datos: PostgreSQL
-- Descripción: Agrega funcionalidades de JWT, categorías de eventos,
--              control de concurrencia, invitados e invitaciones
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE REFRESH TOKENS (para JWT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id_refresh_token SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    revocado BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_user_token UNIQUE (id_usuario)
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(id_usuario);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expiracion ON refresh_tokens(fecha_expiracion);

COMMENT ON TABLE refresh_tokens IS 'Almacena los refresh tokens para la renovación de JWT';

-- ============================================================================
-- 2. AGREGAR CAMPO DE ROL A LA TABLA USUARIO (si no existe)
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='usuario' AND column_name='rol'
    ) THEN
        ALTER TABLE usuario ADD COLUMN rol VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- ============================================================================
-- 3. TABLA DE CATEGORÍAS DE EVENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS categoria_evento (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50), -- nombre del ícono o emoji
    color VARCHAR(20), -- código de color hexadecimal
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categoria_evento_nombre ON categoria_evento(nombre);
CREATE INDEX idx_categoria_evento_activo ON categoria_evento(activo);

COMMENT ON TABLE categoria_evento IS 'Categorías de eventos (Boda, Cumpleaños, Corporativo, etc.)';

-- Insertar categorías iniciales
INSERT INTO categoria_evento (nombre, descripcion, icono, color) VALUES
('Boda', 'Celebraciones de matrimonio', '💍', '#FF69B4'),
('Cumpleaños', 'Fiestas de cumpleaños', '🎂', '#FFD700'),
('Corporativo', 'Eventos empresariales', '💼', '#4169E1'),
('Graduación', 'Ceremonias de graduación', '🎓', '#32CD32'),
('Aniversario', 'Celebraciones de aniversario', '💐', '#FF1493'),
('Quinceañera', 'Celebración de 15 años', '👑', '#FF00FF'),
('Baby Shower', 'Celebración de bebé', '🍼', '#87CEEB'),
('Despedida de Soltero/a', 'Fiestas pre-matrimonio', '🎉', '#FF4500'),
('Retiro Empresarial', 'Retiros y team building', '🏕️', '#8B4513'),
('Concierto', 'Eventos musicales', '🎵', '#9370DB')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 4. MODIFICAR TABLA EVENTO PARA AGREGAR CATEGORÍA Y VERSIONING
-- ============================================================================

-- Agregar campo de categoría
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='evento' AND column_name='id_categoria'
    ) THEN
        ALTER TABLE evento ADD COLUMN id_categoria INTEGER REFERENCES categoria_evento(id_categoria);
    END IF;
END $$;

-- Agregar campos de control de concurrencia (Optimistic Locking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='evento' AND column_name='version'
    ) THEN
        ALTER TABLE evento ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='evento' AND column_name='ultima_modificacion'
    ) THEN
        ALTER TABLE evento ADD COLUMN ultima_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='evento' AND column_name='modificado_por'
    ) THEN
        ALTER TABLE evento ADD COLUMN modificado_por INTEGER REFERENCES usuario(id_usuario);
    END IF;
END $$;

CREATE INDEX idx_evento_categoria ON evento(id_categoria);
CREATE INDEX idx_evento_version ON evento(version);

-- ============================================================================
-- 5. TABLA DE INVITADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitado (
    id_invitado SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    cantidad_personas INTEGER DEFAULT 1,
    confirmado BOOLEAN DEFAULT FALSE,
    asistio BOOLEAN DEFAULT FALSE,
    fecha_confirmacion TIMESTAMP,
    notas TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cantidad_personas CHECK (cantidad_personas > 0)
);

CREATE INDEX idx_invitado_evento ON invitado(id_evento);
CREATE INDEX idx_invitado_email ON invitado(email);
CREATE INDEX idx_invitado_confirmado ON invitado(confirmado);

COMMENT ON TABLE invitado IS 'Lista de invitados para cada evento';

-- ============================================================================
-- 6. TABLA DE INVITACIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitacion (
    id_invitacion SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    id_invitado INTEGER REFERENCES invitado(id_invitado) ON DELETE SET NULL,
    codigo_unico VARCHAR(100) UNIQUE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'email', -- email, whatsapp, fisica
    asunto VARCHAR(255),
    mensaje TEXT,
    fecha_envio TIMESTAMP,
    fecha_apertura TIMESTAMP,
    enviado BOOLEAN DEFAULT FALSE,
    abierto BOOLEAN DEFAULT FALSE,
    respondido BOOLEAN DEFAULT FALSE,
    respuesta TEXT,
    fecha_respuesta TIMESTAMP,
    url_invitacion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitacion_evento ON invitacion(id_evento);
CREATE INDEX idx_invitacion_invitado ON invitacion(id_invitado);
CREATE INDEX idx_invitacion_codigo ON invitacion(codigo_unico);
CREATE INDEX idx_invitacion_enviado ON invitacion(enviado);

COMMENT ON TABLE invitacion IS 'Invitaciones enviadas a los invitados';

-- ============================================================================
-- 7. TABLA DE AUDITORÍA (para rastrear cambios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    id_registro INTEGER NOT NULL,
    accion VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    direccion_ip VARCHAR(50)
);

CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_registro ON auditoria(id_registro);
CREATE INDEX idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_accion);

COMMENT ON TABLE auditoria IS 'Registro de todas las modificaciones en tablas críticas';

-- ============================================================================
-- 8. FUNCIÓN TRIGGER PARA ACTUALIZAR VERSION (Optimistic Locking)
-- ============================================================================
CREATE OR REPLACE FUNCTION incrementar_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.ultima_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla evento
DROP TRIGGER IF EXISTS trigger_evento_version ON evento;
CREATE TRIGGER trigger_evento_version
    BEFORE UPDATE ON evento
    FOR EACH ROW
    EXECUTE FUNCTION incrementar_version();

-- ============================================================================
-- 9. FUNCIÓN TRIGGER PARA AUDITORÍA AUTOMÁTICA
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria (tabla, id_registro, accion, datos_anteriores)
        VALUES (TG_TABLE_NAME, OLD.id_evento, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria (tabla, id_registro, accion, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, NEW.id_evento, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria (tabla, id_registro, accion, datos_nuevos)
        VALUES (TG_TABLE_NAME, NEW.id_evento, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoría a evento
DROP TRIGGER IF EXISTS trigger_auditoria_evento ON evento;
CREATE TRIGGER trigger_auditoria_evento
    AFTER INSERT OR UPDATE OR DELETE ON evento
    FOR EACH ROW
    EXECUTE FUNCTION registrar_auditoria();

-- ============================================================================
-- 10. VISTA PARA ESTADÍSTICAS DE INVITADOS
-- ============================================================================
CREATE OR REPLACE VIEW v_estadisticas_invitados AS
SELECT 
    e.id_evento,
    e.nombre_evento,
    COUNT(i.id_invitado) as total_invitados,
    COALESCE(SUM(i.cantidad_personas), 0) as total_personas,
    COUNT(CASE WHEN i.confirmado = TRUE THEN 1 END) as confirmados,
    COALESCE(SUM(CASE WHEN i.confirmado = TRUE THEN i.cantidad_personas ELSE 0 END), 0) as personas_confirmadas,
    COUNT(CASE WHEN i.asistio = TRUE THEN 1 END) as asistieron,
    COALESCE(SUM(CASE WHEN i.asistio = TRUE THEN i.cantidad_personas ELSE 0 END), 0) as personas_asistieron
FROM evento e
LEFT JOIN invitado i ON e.id_evento = i.id_evento
GROUP BY e.id_evento, e.nombre_evento;

COMMENT ON VIEW v_estadisticas_invitados IS 'Estadísticas de invitados por evento';

-- ============================================================================
-- 11. VISTA PARA ESTADO DE INVITACIONES
-- ============================================================================
CREATE OR REPLACE VIEW v_estado_invitaciones AS
SELECT 
    e.id_evento,
    e.nombre_evento,
    COUNT(inv.id_invitacion) as total_invitaciones,
    COUNT(CASE WHEN inv.enviado = TRUE THEN 1 END) as enviadas,
    COUNT(CASE WHEN inv.abierto = TRUE THEN 1 END) as abiertas,
    COUNT(CASE WHEN inv.respondido = TRUE THEN 1 END) as respondidas,
    ROUND(COUNT(CASE WHEN inv.abierto = TRUE THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(CASE WHEN inv.enviado = TRUE THEN 1 END), 0) * 100, 2) as tasa_apertura,
    ROUND(COUNT(CASE WHEN inv.respondido = TRUE THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(CASE WHEN inv.enviado = TRUE THEN 1 END), 0) * 100, 2) as tasa_respuesta
FROM evento e
LEFT JOIN invitacion inv ON e.id_evento = inv.id_evento
GROUP BY e.id_evento, e.nombre_evento;

COMMENT ON VIEW v_estado_invitaciones IS 'Estado y métricas de invitaciones por evento';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Mensaje de confirmación
DO $$ 
BEGIN
    RAISE NOTICE 'Migración completada exitosamente';
    RAISE NOTICE 'Tablas creadas: refresh_tokens, categoria_evento, invitado, invitacion, auditoria';
    RAISE NOTICE 'Vistas creadas: v_estadisticas_invitados, v_estado_invitaciones';
    RAISE NOTICE 'Triggers creados: optimistic locking y auditoría';
END $$;
