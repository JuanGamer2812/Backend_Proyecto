-- Migración: Crear tabla evento_proveedor para vincular eventos con proveedores
-- Fecha: 2025-12-23

-- Crear tabla evento_proveedor (relación muchos-a-muchos entre evento y proveedor)
CREATE TABLE IF NOT EXISTS evento_proveedor (
  id_evento_proveedor SERIAL PRIMARY KEY,
  id_evento INTEGER NOT NULL,
  id_proveedor BIGINT NOT NULL,
  categoria VARCHAR(50),
  plan VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  notas_adicionales TEXT,
  precio NUMERIC(10,2),
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_proveedor_evento 
    FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE,
  CONSTRAINT fk_evento_proveedor_proveedor 
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT
);

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_evento_proveedor_evento ON evento_proveedor(id_evento);
CREATE INDEX IF NOT EXISTS idx_evento_proveedor_proveedor ON evento_proveedor(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_evento_proveedor_categoria ON evento_proveedor(categoria);
CREATE INDEX IF NOT EXISTS idx_evento_proveedor_fecha ON evento_proveedor(fecha_asignacion);

-- Agregar comentarios
COMMENT ON TABLE evento_proveedor IS 'Tabla de relación muchos-a-muchos entre eventos y proveedores';
COMMENT ON COLUMN evento_proveedor.id_evento_proveedor IS 'ID único de la asignación del proveedor al evento';
COMMENT ON COLUMN evento_proveedor.id_evento IS 'Referencia a la tabla evento';
COMMENT ON COLUMN evento_proveedor.id_proveedor IS 'Referencia a la tabla proveedor';
COMMENT ON COLUMN evento_proveedor.categoria IS 'Categoría del proveedor (MUSICA, CATERING, DECORACION, LUGAR)';
COMMENT ON COLUMN evento_proveedor.plan IS 'Plan específico contratado para este evento';
COMMENT ON COLUMN evento_proveedor.hora_inicio IS 'Hora de inicio del servicio';
COMMENT ON COLUMN evento_proveedor.hora_fin IS 'Hora de fin del servicio';
COMMENT ON COLUMN evento_proveedor.notas_adicionales IS 'Notas especiales para el proveedor';
COMMENT ON COLUMN evento_proveedor.precio IS 'Precio cobrado por el proveedor para este evento';
COMMENT ON COLUMN evento_proveedor.fecha_asignacion IS 'Fecha de asignación del proveedor al evento';
