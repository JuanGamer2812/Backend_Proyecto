-- 2025-12-28: Vista v_listar_rol_permiso compatible con ids para control de versiones
-- Esta vista expone id_rol, id_permiso, nombre_rol y nombre_permiso

CREATE OR REPLACE VIEW public.v_listar_rol_permiso AS
SELECT
  rp.id_rol,
  rp.id_permiso,
  r.nombre_rol AS nombre_rol,
  p.nombre_permiso AS nombre_permiso
FROM public.rol_permiso rp
JOIN public.rol r ON rp.id_rol = r.id_rol
JOIN public.permiso p ON rp.id_permiso = p.id_permiso;
