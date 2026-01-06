-- Agregar columna archivos_paths a trabaja_nosotros_proveedor si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trabaja_nosotros_proveedor'
        AND column_name = 'archivos_paths'
    ) THEN
        ALTER TABLE trabaja_nosotros_proveedor
        ADD COLUMN archivos_paths JSONB;
        
        RAISE NOTICE 'Columna archivos_paths agregada correctamente';
    ELSE
        RAISE NOTICE 'La columna archivos_paths ya existe';
    END IF;
END $$;
