-- Migración 005: Sistema de notificaciones
-- Fecha: 2025-01-22
-- Descripción: Tabla para almacenar notificaciones persistentes

CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- reserva, pago, invitacion, mensaje, proveedor, recordatorio, sistema
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    datos JSONB, -- Datos adicionales en formato JSON
    leida BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    url VARCHAR(500), -- URL de acción opcional
    icono VARCHAR(50), -- Icono para mostrar (bootstrap icons)
    prioridad VARCHAR(20) DEFAULT 'normal' -- normal, alta, urgente
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_notificacion_user ON notificacion(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_leida ON notificacion(leida);
CREATE INDEX IF NOT EXISTS idx_notificacion_fecha ON notificacion(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_notificacion_tipo ON notificacion(tipo);

-- Constraint para prioridad
ALTER TABLE notificacion DROP CONSTRAINT IF EXISTS chk_prioridad;
ALTER TABLE notificacion ADD CONSTRAINT chk_prioridad 
    CHECK (prioridad IN ('normal', 'alta', 'urgente'));

-- Trigger para actualizar fecha de lectura
CREATE OR REPLACE FUNCTION actualizar_fecha_lectura()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.leida = true AND OLD.leida = false THEN
        NEW.fecha_lectura = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fecha_lectura ON notificacion;
CREATE TRIGGER trigger_fecha_lectura
    BEFORE UPDATE ON notificacion
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_lectura();

-- Vista de notificaciones no leídas por usuario
CREATE OR REPLACE VIEW v_notificaciones_no_leidas AS
SELECT 
    user_id,
    COUNT(*) as total_no_leidas,
    COUNT(CASE WHEN prioridad = 'urgente' THEN 1 END) as urgentes,
    COUNT(CASE WHEN prioridad = 'alta' THEN 1 END) as altas,
    MAX(fecha_creacion) as ultima_notificacion
FROM notificacion
WHERE leida = false
GROUP BY user_id;

-- Vista de estadísticas de notificaciones
CREATE OR REPLACE VIEW v_estadisticas_notificaciones AS
SELECT 
    DATE(fecha_creacion) as fecha,
    tipo,
    COUNT(*) as total_enviadas,
    COUNT(CASE WHEN leida = true THEN 1 END) as total_leidas,
    ROUND(
        COUNT(CASE WHEN leida = true THEN 1 END)::numeric / 
        NULLIF(COUNT(*)::numeric, 0) * 100, 
        2
    ) as porcentaje_lectura
FROM notificacion
GROUP BY DATE(fecha_creacion), tipo
ORDER BY fecha DESC, tipo;

-- Función para crear notificación
CREATE OR REPLACE FUNCTION crear_notificacion(
    p_user_id INTEGER,
    p_tipo VARCHAR,
    p_titulo VARCHAR,
    p_mensaje TEXT,
    p_datos JSONB DEFAULT NULL,
    p_url VARCHAR DEFAULT NULL,
    p_icono VARCHAR DEFAULT NULL,
    p_prioridad VARCHAR DEFAULT 'normal'
)
RETURNS INTEGER AS $$
DECLARE
    v_notificacion_id INTEGER;
BEGIN
    INSERT INTO notificacion (
        user_id, tipo, titulo, mensaje, datos, url, icono, prioridad
    ) VALUES (
        p_user_id, p_tipo, p_titulo, p_mensaje, p_datos, p_url, p_icono, p_prioridad
    ) RETURNING id_notificacion INTO v_notificacion_id;
    
    RETURN v_notificacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(p_notificacion_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE notificacion
    SET leida = true
    WHERE id_notificacion = p_notificacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar todas las notificaciones de un usuario como leídas
CREATE OR REPLACE FUNCTION marcar_todas_leidas(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE notificacion
    SET leida = true
    WHERE user_id = p_user_id AND leida = false;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar notificaciones antiguas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_notificaciones_antiguas(p_dias INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_eliminadas INTEGER;
BEGIN
    DELETE FROM notificacion
    WHERE fecha_creacion < CURRENT_TIMESTAMP - (p_dias || ' days')::INTERVAL
      AND leida = true;
    
    GET DIAGNOSTICS v_eliminadas = ROW_COUNT;
    
    RAISE NOTICE 'Notificaciones eliminadas: %', v_eliminadas;
    RETURN v_eliminadas;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener notificaciones de un usuario
CREATE OR REPLACE FUNCTION obtener_notificaciones_usuario(
    p_user_id INTEGER,
    p_limite INTEGER DEFAULT 50,
    p_solo_no_leidas BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id_notificacion INTEGER,
    tipo VARCHAR,
    titulo VARCHAR,
    mensaje TEXT,
    datos JSONB,
    leida BOOLEAN,
    fecha_creacion TIMESTAMP,
    url VARCHAR,
    icono VARCHAR,
    prioridad VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id_notificacion,
        n.tipo,
        n.titulo,
        n.mensaje,
        n.datos,
        n.leida,
        n.fecha_creacion,
        n.url,
        n.icono,
        n.prioridad
    FROM notificacion n
    WHERE n.user_id = p_user_id
      AND (NOT p_solo_no_leidas OR n.leida = false)
    ORDER BY n.leida ASC, n.fecha_creacion DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- Triggers automáticos para crear notificaciones

-- Trigger: Nueva reserva creada
CREATE OR REPLACE FUNCTION notificar_nueva_reserva()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion(
        (SELECT id_usuario FROM evento WHERE id_evento = NEW.id_evento),
        'reserva',
        'Nueva Reserva Creada',
        'Tu reserva ha sido creada exitosamente',
        jsonb_build_object('id_reserva', NEW.id_reserva),
        '/reserva/' || NEW.id_reserva,
        'bi-calendar-check',
        'normal'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_reserva ON reserva;
CREATE TRIGGER trigger_notificar_reserva
    AFTER INSERT ON reserva
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_reserva();

-- Trigger: Pago completado
CREATE OR REPLACE FUNCTION notificar_pago_completado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_pago = 'completado' AND (OLD.estado_pago IS NULL OR OLD.estado_pago != 'completado') THEN
        PERFORM crear_notificacion(
            (SELECT e.id_usuario FROM reserva r 
             JOIN evento e ON r.id_evento = e.id_evento 
             WHERE r.id_reserva = NEW.id_reserva),
            'pago',
            'Pago Recibido',
            'Tu pago de $' || NEW.monto || ' ha sido procesado exitosamente',
            jsonb_build_object('id_pago', NEW.id_pago, 'monto', NEW.monto),
            '/factura/' || NEW.id_pago,
            'bi-credit-card-fill',
            'alta'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_pago ON pago;
CREATE TRIGGER trigger_notificar_pago
    AFTER INSERT OR UPDATE OF estado_pago ON pago
    FOR EACH ROW
    EXECUTE FUNCTION notificar_pago_completado();

-- Comentarios
COMMENT ON TABLE notificacion IS 'Almacena notificaciones persistentes para usuarios';
COMMENT ON COLUMN notificacion.datos IS 'Datos adicionales en formato JSON';
COMMENT ON COLUMN notificacion.prioridad IS 'Prioridad: normal, alta, urgente';
COMMENT ON VIEW v_notificaciones_no_leidas IS 'Contador de notificaciones no leídas por usuario';

RAISE NOTICE 'Migración 005: Sistema de notificaciones completado exitosamente';
