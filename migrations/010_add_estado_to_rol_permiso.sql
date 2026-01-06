-- MIGRACIÓN: Agregar columna 'estado' a la tabla rol_permiso si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='rol_permiso' AND column_name='estado'
    ) THEN
        ALTER TABLE rol_permiso ADD COLUMN estado boolean NOT NULL DEFAULT true;
    END IF;
END $$;
