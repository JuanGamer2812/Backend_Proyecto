BEGIN;

-- Elimina la columna tipo_evento_id (y dependencias) de la tabla evento.
ALTER TABLE public.evento DROP COLUMN IF EXISTS tipo_evento_id CASCADE;

COMMIT;
