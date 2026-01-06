-- Migración: Sistema de Categorías y Reservas
-- Fecha: 2025-12-23

-- ========================================
-- 1. CREAR TABLA CATEGORIAS
-- ========================================
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. INSERTAR CATEGORÍAS INICIALES
-- ========================================
INSERT INTO categoria (nombre, icono) VALUES
    ('Música', 'bi-music-note-beamed'),
    ('Catering', 'bi-egg-fried'),
    ('Decoración', 'bi-balloon-heart'),
    ('Lugar', 'bi-geo-alt'),
    ('Fotografía', 'bi-camera'),
    ('Video', 'bi-film')
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- 3. ACTUALIZAR TABLA PROVEEDOR
-- ========================================
-- Agregar columna categoria si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proveedor' AND column_name = 'categoria'
    ) THEN
        ALTER TABLE proveedor ADD COLUMN categoria VARCHAR(50);
    END IF;
END $$;

-- Agregar columna estado si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proveedor' AND column_name = 'estado'
    ) THEN
        ALTER TABLE proveedor ADD COLUMN estado VARCHAR(20) DEFAULT 'pendiente';
    END IF;
END $$;

-- Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_proveedor_categoria ON proveedor(categoria);
CREATE INDEX IF NOT EXISTS idx_proveedor_estado ON proveedor(estado);

-- ========================================
-- 4. CREAR TABLA RESERVAS
-- ========================================
CREATE TABLE IF NOT EXISTS reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    nombre_evento VARCHAR(100) NOT NULL,
    tipo_evento VARCHAR(100),
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    precio_base DECIMAL(10,2),
    hay_playlist BOOLEAN DEFAULT FALSE,
    playlist VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Índices para reserva
CREATE INDEX IF NOT EXISTS idx_reserva_usuario ON reserva(id_usuario);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON reserva(estado);
CREATE INDEX IF NOT EXISTS idx_reserva_fecha_inicio ON reserva(fecha_inicio);

-- ========================================
-- 5. CREAR TABLA RESERVA_PROVEEDOR (relación muchos a muchos)
-- ========================================
CREATE TABLE IF NOT EXISTS reserva_proveedor (
    id SERIAL PRIMARY KEY,
    id_reserva INTEGER NOT NULL,
    id_proveedor INTEGER NOT NULL,
    categoria VARCHAR(50),
    plan VARCHAR(20),
    hora_inicio TIME,
    hora_fin TIME,
    notas_adicionales TEXT,
    precio_acordado DECIMAL(10,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
    UNIQUE(id_reserva, id_proveedor)
);

-- Índices para reserva_proveedor
CREATE INDEX IF NOT EXISTS idx_reserva_prov_reserva ON reserva_proveedor(id_reserva);
CREATE INDEX IF NOT EXISTS idx_reserva_prov_proveedor ON reserva_proveedor(id_proveedor);

-- ========================================
-- 6. COMENTARIOS EN TABLAS
-- ========================================
COMMENT ON TABLE categoria IS 'Categorías de proveedores de servicios';
COMMENT ON TABLE reserva IS 'Reservas de eventos realizadas por usuarios';
COMMENT ON TABLE reserva_proveedor IS 'Relación entre reservas y proveedores contratados';

COMMENT ON COLUMN proveedor.estado IS 'Estados posibles: pendiente, aprobado, rechazado';
COMMENT ON COLUMN reserva.estado IS 'Estados posibles: pendiente, confirmado, cancelado, completado';
