-- Migración 004: Sistema completo de proveedores mejorado
-- Fecha: 2025-01-22
-- Descripción: Actualiza tabla de proveedores con sistema de aprobación y servicios

-- Agregar columnas de aprobación si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'estado_aprobacion') THEN
        ALTER TABLE proveedor ADD COLUMN estado_aprobacion VARCHAR(20) DEFAULT 'pendiente';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'fecha_aprobacion') THEN
        ALTER TABLE proveedor ADD COLUMN fecha_aprobacion TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'aprobado_por') THEN
        ALTER TABLE proveedor ADD COLUMN aprobado_por INTEGER REFERENCES usuario(id_usuario);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'razon_rechazo') THEN
        ALTER TABLE proveedor ADD COLUMN razon_rechazo TEXT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'activo') THEN
        ALTER TABLE proveedor ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'calificacion_promedio') THEN
        ALTER TABLE proveedor ADD COLUMN calificacion_promedio DECIMAL(3,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'total_calificaciones') THEN
        ALTER TABLE proveedor ADD COLUMN total_calificaciones INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'fecha_registro') THEN
        ALTER TABLE proveedor ADD COLUMN fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proveedor' AND column_name = 'verificado') THEN
        ALTER TABLE proveedor ADD COLUMN verificado BOOLEAN DEFAULT false;
    END IF;
END$$;

-- Tabla de servicios ofrecidos por proveedores
CREATE TABLE IF NOT EXISTS proveedor_servicio (
    id_servicio SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
    tipo_servicio VARCHAR(50) NOT NULL, -- musica, catering, decoracion, fotografia, etc.
    nombre_servicio VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_base DECIMAL(10,2),
    precio_max DECIMAL(10,2),
    unidad_precio VARCHAR(20), -- por hora, por evento, por persona, etc.
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_proveedor_servicio UNIQUE(id_proveedor, nombre_servicio)
);

-- Tabla de documentos/certificaciones del proveedor
CREATE TABLE IF NOT EXISTS proveedor_documento (
    id_documento SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL, -- RUT, certificado, licencia, etc.
    nombre_archivo VARCHAR(255) NOT NULL,
    url_documento TEXT NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verificado BOOLEAN DEFAULT false,
    fecha_verificacion TIMESTAMP NULL
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_proveedor_estado ON proveedor(estado_aprobacion);
CREATE INDEX IF NOT EXISTS idx_proveedor_activo ON proveedor(activo);
CREATE INDEX IF NOT EXISTS idx_proveedor_calificacion ON proveedor(calificacion_promedio DESC);
CREATE INDEX IF NOT EXISTS idx_proveedor_servicio_tipo ON proveedor_servicio(tipo_servicio);
CREATE INDEX IF NOT EXISTS idx_proveedor_servicio_proveedor ON proveedor_servicio(id_proveedor);

-- Constraint para estado de aprobación
ALTER TABLE proveedor DROP CONSTRAINT IF EXISTS chk_estado_aprobacion;
ALTER TABLE proveedor ADD CONSTRAINT chk_estado_aprobacion 
    CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado', 'suspendido'));

-- Trigger para actualizar fecha de aprobación
CREATE OR REPLACE FUNCTION actualizar_fecha_aprobacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_aprobacion = 'aprobado' AND OLD.estado_aprobacion != 'aprobado' THEN
        NEW.fecha_aprobacion = CURRENT_TIMESTAMP;
        NEW.verificado = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fecha_aprobacion ON proveedor;
CREATE TRIGGER trigger_fecha_aprobacion
    BEFORE UPDATE ON proveedor
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_aprobacion();

-- Vista completa de proveedores con servicios
CREATE OR REPLACE VIEW v_proveedores_completo AS
SELECT 
    p.*,
    u.nombre as nombre_aprobador,
    COUNT(DISTINCT ps.id_servicio) as total_servicios,
    COUNT(DISTINCT pd.id_documento) as total_documentos,
    STRING_AGG(DISTINCT ps.tipo_servicio, ', ') as tipos_servicios,
    COUNT(DISTINCT r.id_reserva) as total_reservas
FROM proveedor p
LEFT JOIN usuario u ON p.aprobado_por = u.id_usuario
LEFT JOIN proveedor_servicio ps ON p.id_proveedor = ps.id_proveedor
LEFT JOIN proveedor_documento pd ON p.id_proveedor = pd.id_proveedor
LEFT JOIN reserva r ON p.id_proveedor = r.id_proveedor
GROUP BY p.id_proveedor, u.nombre;

-- Vista de proveedores por aprobar (para admin)
CREATE OR REPLACE VIEW v_proveedores_pendientes AS
SELECT 
    p.id_proveedor,
    p.nombre_empresa,
    p.tipo_empresa,
    p.email,
    p.telefono,
    p.fecha_registro,
    COUNT(ps.id_servicio) as servicios_ofrecidos,
    COUNT(pd.id_documento) as documentos_cargados
FROM proveedor p
LEFT JOIN proveedor_servicio ps ON p.id_proveedor = ps.id_proveedor
LEFT JOIN proveedor_documento pd ON p.id_proveedor = pd.id_proveedor
WHERE p.estado_aprobacion = 'pendiente'
GROUP BY p.id_proveedor
ORDER BY p.fecha_registro ASC;

-- Vista de proveedores top (mejor calificados)
CREATE OR REPLACE VIEW v_proveedores_top AS
SELECT 
    p.id_proveedor,
    p.nombre_empresa,
    p.tipo_empresa,
    p.calificacion_promedio,
    p.total_calificaciones,
    COUNT(DISTINCT r.id_reserva) as total_reservas,
    STRING_AGG(DISTINCT ps.tipo_servicio, ', ') as servicios
FROM proveedor p
LEFT JOIN proveedor_servicio ps ON p.id_proveedor = ps.id_proveedor
LEFT JOIN reserva r ON p.id_proveedor = r.id_proveedor
WHERE p.estado_aprobacion = 'aprobado' 
  AND p.activo = true
  AND p.total_calificaciones >= 5
GROUP BY p.id_proveedor
ORDER BY p.calificacion_promedio DESC, p.total_calificaciones DESC
LIMIT 10;

-- Función para aprobar proveedor
CREATE OR REPLACE FUNCTION aprobar_proveedor(
    p_id_proveedor INTEGER,
    p_id_admin INTEGER,
    p_mensaje TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE proveedor
    SET estado_aprobacion = 'aprobado',
        aprobado_por = p_id_admin,
        verificado = true
    WHERE id_proveedor = p_id_proveedor;

    -- Log de auditoría
    INSERT INTO auditoria (tabla_afectada, accion, usuario_id, detalles)
    VALUES ('proveedor', 'APROBAR', p_id_admin, 
            jsonb_build_object('id_proveedor', p_id_proveedor, 'mensaje', p_mensaje));
END;
$$ LANGUAGE plpgsql;

-- Función para rechazar proveedor
CREATE OR REPLACE FUNCTION rechazar_proveedor(
    p_id_proveedor INTEGER,
    p_id_admin INTEGER,
    p_razon TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE proveedor
    SET estado_aprobacion = 'rechazado',
        aprobado_por = p_id_admin,
        razon_rechazo = p_razon
    WHERE id_proveedor = p_id_proveedor;

    -- Log de auditoría
    INSERT INTO auditoria (tabla_afectada, accion, usuario_id, detalles)
    VALUES ('proveedor', 'RECHAZAR', p_id_admin, 
            jsonb_build_object('id_proveedor', p_id_proveedor, 'razon', p_razon));
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar calificación promedio
CREATE OR REPLACE FUNCTION actualizar_calificacion_proveedor()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE proveedor
    SET calificacion_promedio = (
            SELECT ROUND(AVG(calificacion)::numeric, 2)
            FROM resenia
            WHERE id_proveedor = NEW.id_proveedor
        ),
        total_calificaciones = (
            SELECT COUNT(*)
            FROM resenia
            WHERE id_proveedor = NEW.id_proveedor
        )
    WHERE id_proveedor = NEW.id_proveedor;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar calificación cuando se crea/actualiza una reseña
DROP TRIGGER IF EXISTS trigger_actualizar_calificacion ON resenia;
CREATE TRIGGER trigger_actualizar_calificacion
    AFTER INSERT OR UPDATE OF calificacion ON resenia
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_calificacion_proveedor();

-- Función para obtener proveedores por tipo de servicio
CREATE OR REPLACE FUNCTION obtener_proveedores_por_servicio(
    p_tipo_servicio VARCHAR
)
RETURNS TABLE (
    id_proveedor INTEGER,
    nombre_empresa VARCHAR,
    calificacion_promedio DECIMAL,
    precio_desde DECIMAL,
    precio_hasta DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id_proveedor,
        p.nombre_empresa,
        p.calificacion_promedio,
        MIN(ps.precio_base) as precio_desde,
        MAX(ps.precio_max) as precio_hasta
    FROM proveedor p
    JOIN proveedor_servicio ps ON p.id_proveedor = ps.id_proveedor
    WHERE ps.tipo_servicio = p_tipo_servicio
      AND p.estado_aprobacion = 'aprobado'
      AND p.activo = true
      AND ps.activo = true
    GROUP BY p.id_proveedor, p.nombre_empresa, p.calificacion_promedio
    ORDER BY p.calificacion_promedio DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON COLUMN proveedor.estado_aprobacion IS 'Estados: pendiente, aprobado, rechazado, suspendido';
COMMENT ON TABLE proveedor_servicio IS 'Servicios específicos ofrecidos por cada proveedor';
COMMENT ON TABLE proveedor_documento IS 'Documentos y certificaciones del proveedor';
COMMENT ON VIEW v_proveedores_pendientes IS 'Proveedores esperando aprobación del administrador';

RAISE NOTICE 'Migración 004: Sistema de proveedores completado exitosamente';
