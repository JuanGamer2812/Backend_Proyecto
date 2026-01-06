BEGIN;

-- Allow evento.tipo_evento_id to be nullable so the API can ignore this field.
ALTER TABLE public.evento ALTER COLUMN tipo_evento_id DROP NOT NULL;
ALTER TABLE public.evento ALTER COLUMN tipo_evento_id DROP DEFAULT;

COMMIT;
