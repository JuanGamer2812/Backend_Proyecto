-- Migration: add unique index on refresh_tokens.id_usuario and create v_listar_resenia view

BEGIN;

-- Ensure unique index so ON CONFLICT (id_usuario) works as expected
CREATE UNIQUE INDEX IF NOT EXISTS ux_refresh_tokens_id_usuario ON public.refresh_tokens (id_usuario);

-- Create view v_listar_resenia used by the application
-- Columns expected by application include "Calificacion" (capitalized) used in queries
CREATE OR REPLACE VIEW public.v_listar_resenia AS
SELECT
  r.id_resena AS id_resena,
  r.id_evento AS id_evento,
  r.id_usuario AS id_usuario,
  u.nombre_usuario AS Nombre,
  r.calificacion AS "Calificacion",
  r.comentario AS Comentario,
  r.fecha_creacion AS Fecha_creacion
FROM public.resena_evento r
LEFT JOIN public.usuario u ON u.id_usuario = r.id_usuario;

COMMIT;
