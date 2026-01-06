-- Migración 003: Actualización de tabla de pagos para Stripe
-- Fecha: 2025-01-22
-- Descripción: Agrega columnas para integración con Stripe y mejora tracking de pagos

-- Verificar si existe la tabla pago
DO $$
BEGIN
    -- Agregar columnas de Stripe si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pago' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE pago ADD COLUMN stripe_payment_intent_id VARCHAR(255) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pago' AND column_name = 'estado_pago') THEN
        ALTER TABLE pago ADD COLUMN estado_pago VARCHAR(50) DEFAULT 'pendiente';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pago' AND column_name = 'fecha_actualizacion') THEN
        ALTER TABLE pago ADD COLUMN fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pago' AND column_name = 'moneda') THEN
        ALTER TABLE pago ADD COLUMN moneda VARCHAR(3) DEFAULT 'USD';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pago' AND column_name = 'stripe_refund_id') THEN
        ALTER TABLE pago ADD COLUMN stripe_refund_id VARCHAR(255);
    END IF;
END$$;

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_pago_stripe_payment_intent 
    ON pago(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_pago_estado 
    ON pago(estado_pago);

CREATE INDEX IF NOT EXISTS idx_pago_fecha 
    ON pago(fecha_pago DESC);

-- Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_pago_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pago_fecha_actualizacion ON pago;

CREATE TRIGGER trigger_pago_fecha_actualizacion
    BEFORE UPDATE ON pago
    FOR EACH ROW
    EXECUTE FUNCTION update_pago_fecha_actualizacion();

-- Vista para estadísticas de pagos
CREATE OR REPLACE VIEW v_estadisticas_pagos AS
SELECT 
    DATE(fecha_pago) as fecha,
    COUNT(*) as total_pagos,
    SUM(monto) as monto_total,
    COUNT(CASE WHEN estado_pago = 'completado' THEN 1 END) as pagos_completados,
    COUNT(CASE WHEN estado_pago = 'fallido' THEN 1 END) as pagos_fallidos,
    COUNT(CASE WHEN estado_pago = 'reembolsado' THEN 1 END) as pagos_reembolsados,
    SUM(CASE WHEN estado_pago = 'completado' THEN monto ELSE 0 END) as ingresos_confirmados,
    AVG(CASE WHEN estado_pago = 'completado' THEN monto END) as ticket_promedio
FROM pago
GROUP BY DATE(fecha_pago)
ORDER BY fecha DESC;

-- Vista para pagos por método
CREATE OR REPLACE VIEW v_pagos_por_metodo AS
SELECT 
    metodo_pago,
    COUNT(*) as total_transacciones,
    SUM(monto) as monto_total,
    AVG(monto) as monto_promedio,
    COUNT(CASE WHEN estado_pago = 'completado' THEN 1 END) as transacciones_exitosas
FROM pago
GROUP BY metodo_pago
ORDER BY monto_total DESC;

-- Vista detallada de pagos con información del evento
CREATE OR REPLACE VIEW v_pagos_detallados AS
SELECT 
    p.id_pago,
    p.monto,
    p.metodo_pago,
    p.estado_pago,
    p.fecha_pago,
    p.stripe_payment_intent_id,
    p.moneda,
    r.id_reserva,
    e.id_evento,
    e.nombre_evento,
    e.tipo_evento,
    u.nombre as nombre_cliente,
    u.email as email_cliente
FROM pago p
JOIN reserva r ON p.id_reserva = r.id_reserva
JOIN evento e ON r.id_evento = e.id_evento
JOIN usuario u ON e.id_usuario = u.id_usuario
ORDER BY p.fecha_pago DESC;

-- Función para obtener ingresos por período
CREATE OR REPLACE FUNCTION obtener_ingresos_periodo(
    fecha_inicio DATE,
    fecha_fin DATE
)
RETURNS TABLE (
    total_ingresos NUMERIC,
    total_pagos BIGINT,
    ticket_promedio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(monto) as total_ingresos,
        COUNT(*) as total_pagos,
        AVG(monto) as ticket_promedio
    FROM pago
    WHERE fecha_pago BETWEEN fecha_inicio AND fecha_fin
      AND estado_pago = 'completado';
END;
$$ LANGUAGE plpgsql;

-- Función para detectar pagos duplicados (mismo monto y reserva en corto período)
CREATE OR REPLACE FUNCTION detectar_pagos_duplicados()
RETURNS TABLE (
    id_reserva INTEGER,
    monto NUMERIC,
    cantidad BIGINT,
    fecha_primer_pago TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id_reserva,
        p.monto,
        COUNT(*) as cantidad,
        MIN(p.fecha_pago) as fecha_primer_pago
    FROM pago p
    WHERE p.fecha_pago > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    GROUP BY p.id_reserva, p.monto
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON COLUMN pago.stripe_payment_intent_id IS 'ID del PaymentIntent de Stripe (único)';
COMMENT ON COLUMN pago.estado_pago IS 'Estados: pendiente, completado, fallido, reembolsado';
COMMENT ON COLUMN pago.stripe_refund_id IS 'ID del reembolso de Stripe si aplica';
COMMENT ON VIEW v_estadisticas_pagos IS 'Estadísticas diarias de pagos y revenue';
COMMENT ON VIEW v_pagos_detallados IS 'Vista completa de pagos con información del evento y cliente';

RAISE NOTICE 'Migración 003: Tablas y vistas de pagos actualizadas exitosamente';
