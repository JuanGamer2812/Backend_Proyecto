BEGIN;

-- Eliminar vistas que dependan de tipo_evento (si existen)
DROP VIEW IF EXISTS public.v_listar_evento_unificado CASCADE;

-- Eliminar la tabla tipo_evento y cualquier dependencia remanente
DROP TABLE IF EXISTS public.tipo_evento CASCADE;

COMMIT;
