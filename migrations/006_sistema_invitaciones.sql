-- Migración 006: Sistema de Invitaciones y RSVP
-- Fecha: 2025-01-22
-- Descripción: Sistema completo para gestionar invitados y confirmaciones de asistencia

-- Tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitacion (
    id_invitacion SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    nombre_invitado VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    codigo_unico VARCHAR(50) UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, confirmado, rechazado, cancelado
    numero_acompanantes INTEGER DEFAULT 0,
    acompanantes_confirmados INTEGER DEFAULT 0,
    mensaje_personalizado TEXT,
    fecha_envio TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado BOOLEAN DEFAULT false,
    notas TEXT,
    categoria VARCHAR(50), -- familia, amigos, trabajo, vip, etc.
    mesa_asignada VARCHAR(50),
    restricciones_alimentarias TEXT,
    ip_confirmacion INET,
    user_agent_confirmacion TEXT
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_invitacion_evento ON invitacion(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitacion_codigo ON invitacion(codigo_unico);
CREATE INDEX IF NOT EXISTS idx_invitacion_email ON invitacion(email);
CREATE INDEX IF NOT EXISTS idx_invitacion_estado ON invitacion(estado);
CREATE INDEX IF NOT EXISTS idx_invitacion_categoria ON invitacion(categoria);

-- Constraints
ALTER TABLE invitacion DROP CONSTRAINT IF EXISTS chk_estado_invitacion;
ALTER TABLE invitacion ADD CONSTRAINT chk_estado_invitacion 
    CHECK (estado IN ('pendiente', 'confirmado', 'rechazado', 'cancelado'));

ALTER TABLE invitacion DROP CONSTRAINT IF EXISTS chk_acompanantes;
ALTER TABLE invitacion ADD CONSTRAINT chk_acompanantes 
    CHECK (numero_acompanantes >= 0 AND acompanantes_confirmados >= 0);

ALTER TABLE invitacion DROP CONSTRAINT IF EXISTS chk_acompanantes_logico;
ALTER TABLE invitacion ADD CONSTRAINT chk_acompanantes_logico 
    CHECK (acompanantes_confirmados <= numero_acompanantes);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION actualizar_fecha_invitacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    
    -- Registrar fecha de confirmación
    IF NEW.estado IN ('confirmado', 'rechazado') AND OLD.estado = 'pendiente' THEN
        NEW.fecha_confirmacion = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_invitacion ON invitacion;
CREATE TRIGGER trigger_actualizar_invitacion
    BEFORE UPDATE ON invitacion
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_invitacion();

-- Vista de estadísticas de invitaciones por evento
CREATE OR REPLACE VIEW v_estadisticas_invitaciones AS
SELECT 
    e.id_evento,
    e.nombre_evento,
    COUNT(i.id_invitacion) as total_invitados,
    COUNT(CASE WHEN i.estado = 'pendiente' THEN 1 END) as pendientes,
    COUNT(CASE WHEN i.estado = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN i.estado = 'rechazado' THEN 1 END) as rechazados,
    COUNT(CASE WHEN i.estado = 'cancelado' THEN 1 END) as cancelados,
    COUNT(CASE WHEN i.enviado = true THEN 1 END) as invitaciones_enviadas,
    SUM(CASE WHEN i.estado = 'confirmado' THEN (1 + i.acompanantes_confirmados) ELSE 0 END) as asistentes_confirmados,
    ROUND(
        COUNT(CASE WHEN i.estado = 'confirmado' THEN 1 END)::numeric / 
        NULLIF(COUNT(i.id_invitacion)::numeric, 0) * 100, 
        2
    ) as porcentaje_confirmacion
FROM evento e
LEFT JOIN invitacion i ON e.id_evento = i.id_evento
GROUP BY e.id_evento, e.nombre_evento;

-- Vista de invitaciones con detalles del evento
CREATE OR REPLACE VIEW v_invitaciones_detalle AS
SELECT 
    i.id_invitacion,
    i.nombre_invitado,
    i.email,
    i.telefono,
    i.codigo_unico,
    i.estado,
    i.numero_acompanantes,
    i.acompanantes_confirmados,
    i.categoria,
    i.mesa_asignada,
    i.fecha_confirmacion,
    i.restricciones_alimentarias,
    e.id_evento,
    e.nombre_evento,
    e.fecha_evento,
    e.ubicacion,
    u.nombre as organizador_nombre,
    u.email as organizador_email
FROM invitacion i
JOIN evento e ON i.id_evento = e.id_evento
JOIN usuario u ON e.id_usuario = u.id_usuario;

-- Vista de invitaciones por categoría
CREATE OR REPLACE VIEW v_invitaciones_por_categoria AS
SELECT 
    id_evento,
    categoria,
    COUNT(*) as total,
    COUNT(CASE WHEN estado = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
FROM invitacion
WHERE categoria IS NOT NULL
GROUP BY id_evento, categoria;

-- Función para generar código único de invitación
CREATE OR REPLACE FUNCTION generar_codigo_invitacion()
RETURNS VARCHAR AS $$
DECLARE
    codigo VARCHAR;
    existe BOOLEAN;
BEGIN
    LOOP
        -- Generar código alfanumérico de 10 caracteres
        codigo := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM invitacion WHERE codigo_unico = codigo) INTO existe;
        
        EXIT WHEN NOT existe;
    END LOOP;
    
    RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- Función para crear invitación
CREATE OR REPLACE FUNCTION crear_invitacion(
    p_id_evento INTEGER,
    p_nombre_invitado VARCHAR,
    p_email VARCHAR,
    p_telefono VARCHAR DEFAULT NULL,
    p_numero_acompanantes INTEGER DEFAULT 0,
    p_mensaje_personalizado TEXT DEFAULT NULL,
    p_categoria VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_invitacion_id INTEGER;
    v_codigo VARCHAR;
BEGIN
    -- Generar código único
    v_codigo := generar_codigo_invitacion();
    
    -- Insertar invitación
    INSERT INTO invitacion (
        id_evento, nombre_invitado, email, telefono, 
        codigo_unico, numero_acompanantes, mensaje_personalizado, categoria
    ) VALUES (
        p_id_evento, p_nombre_invitado, p_email, p_telefono,
        v_codigo, p_numero_acompanantes, p_mensaje_personalizado, p_categoria
    ) RETURNING id_invitacion INTO v_invitacion_id;
    
    RETURN v_invitacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función para confirmar asistencia (RSVP)
CREATE OR REPLACE FUNCTION confirmar_asistencia(
    p_codigo_unico VARCHAR,
    p_acompanantes_confirmados INTEGER,
    p_restricciones_alimentarias TEXT DEFAULT NULL,
    p_ip_confirmacion INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitacion RECORD;
BEGIN
    -- Obtener invitación
    SELECT * INTO v_invitacion
    FROM invitacion
    WHERE codigo_unico = p_codigo_unico;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código de invitación no válido';
    END IF;
    
    -- Validar número de acompañantes
    IF p_acompanantes_confirmados > v_invitacion.numero_acompanantes THEN
        RAISE EXCEPTION 'Número de acompañantes excede el permitido';
    END IF;
    
    -- Actualizar invitación
    UPDATE invitacion
    SET 
        estado = 'confirmado',
        acompanantes_confirmados = p_acompanantes_confirmados,
        restricciones_alimentarias = p_restricciones_alimentarias,
        ip_confirmacion = p_ip_confirmacion,
        user_agent_confirmacion = p_user_agent
    WHERE codigo_unico = p_codigo_unico;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para rechazar invitación
CREATE OR REPLACE FUNCTION rechazar_invitacion(p_codigo_unico VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE invitacion
    SET estado = 'rechazado'
    WHERE codigo_unico = p_codigo_unico;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código de invitación no válido';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar invitación como enviada
CREATE OR REPLACE FUNCTION marcar_invitacion_enviada(p_invitacion_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE invitacion
    SET 
        enviado = true,
        fecha_envio = CURRENT_TIMESTAMP
    WHERE id_invitacion = p_invitacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener invitaciones de un evento
CREATE OR REPLACE FUNCTION obtener_invitaciones_evento(p_evento_id INTEGER)
RETURNS TABLE (
    id_invitacion INTEGER,
    nombre_invitado VARCHAR,
    email VARCHAR,
    telefono VARCHAR,
    codigo_unico VARCHAR,
    estado VARCHAR,
    numero_acompanantes INTEGER,
    acompanantes_confirmados INTEGER,
    categoria VARCHAR,
    mesa_asignada VARCHAR,
    enviado BOOLEAN,
    fecha_confirmacion TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id_invitacion,
        i.nombre_invitado,
        i.email,
        i.telefono,
        i.codigo_unico,
        i.estado,
        i.numero_acompanantes,
        i.acompanantes_confirmados,
        i.categoria,
        i.mesa_asignada,
        i.enviado,
        i.fecha_confirmacion
    FROM invitacion i
    WHERE i.id_evento = p_evento_id
    ORDER BY i.fecha_creacion DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener detalles de invitación por código
CREATE OR REPLACE FUNCTION obtener_invitacion_por_codigo(p_codigo VARCHAR)
RETURNS TABLE (
    id_invitacion INTEGER,
    nombre_invitado VARCHAR,
    email VARCHAR,
    numero_acompanantes INTEGER,
    acompanantes_confirmados INTEGER,
    estado VARCHAR,
    mensaje_personalizado TEXT,
    restricciones_alimentarias TEXT,
    nombre_evento VARCHAR,
    fecha_evento TIMESTAMP,
    ubicacion VARCHAR,
    descripcion TEXT,
    organizador_nombre VARCHAR,
    organizador_email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id_invitacion,
        i.nombre_invitado,
        i.email,
        i.numero_acompanantes,
        i.acompanantes_confirmados,
        i.estado,
        i.mensaje_personalizado,
        i.restricciones_alimentarias,
        e.nombre_evento,
        e.fecha_evento,
        e.ubicacion,
        e.descripcion,
        u.nombre as organizador_nombre,
        u.email as organizador_email
    FROM invitacion i
    JOIN evento e ON i.id_evento = e.id_evento
    JOIN usuario u ON e.id_usuario = u.id_usuario
    WHERE i.codigo_unico = p_codigo;
END;
$$ LANGUAGE plpgsql;

-- Trigger automático: Notificar al organizador cuando se confirma asistencia
CREATE OR REPLACE FUNCTION notificar_confirmacion_asistencia()
RETURNS TRIGGER AS $$
DECLARE
    v_organizador_id INTEGER;
BEGIN
    IF NEW.estado = 'confirmado' AND OLD.estado = 'pendiente' THEN
        -- Obtener ID del organizador
        SELECT e.id_usuario INTO v_organizador_id
        FROM evento e
        WHERE e.id_evento = NEW.id_evento;
        
        -- Crear notificación
        PERFORM crear_notificacion(
            v_organizador_id,
            'invitacion',
            'Invitado Confirmó Asistencia',
            NEW.nombre_invitado || ' confirmó asistencia a tu evento',
            jsonb_build_object(
                'id_invitacion', NEW.id_invitacion,
                'id_evento', NEW.id_evento,
                'acompanantes', NEW.acompanantes_confirmados
            ),
            '/evento/' || NEW.id_evento || '/invitados',
            'bi-person-check-fill',
            'normal'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_confirmacion ON invitacion;
CREATE TRIGGER trigger_notificar_confirmacion
    AFTER UPDATE OF estado ON invitacion
    FOR EACH ROW
    EXECUTE FUNCTION notificar_confirmacion_asistencia();

-- Comentarios
COMMENT ON TABLE invitacion IS 'Gestión de invitados y confirmaciones RSVP';
COMMENT ON COLUMN invitacion.codigo_unico IS 'Código alfanumérico único para RSVP';
COMMENT ON COLUMN invitacion.acompanantes_confirmados IS 'Número de acompañantes que confirmaron';
COMMENT ON VIEW v_estadisticas_invitaciones IS 'Estadísticas de invitaciones por evento';

RAISE NOTICE 'Migración 006: Sistema de invitaciones completado exitosamente';
