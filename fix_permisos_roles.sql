-- Eliminar permisos exclusivos de admin del rol Usuario (id_rol=2)
DELETE FROM rol_permiso 
WHERE id_rol = 2 
AND id_permiso IN (4, 8, 9);

-- Asegurar que el rol Administrador (id_rol=1) tenga TODOS los permisos
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 1, p.id_permiso
FROM permiso p
WHERE NOT EXISTS (
  SELECT 1 FROM rol_permiso rp 
  WHERE rp.id_rol = 1 AND rp.id_permiso = p.id_permiso
)
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Asegurar que el rol Usuario (id_rol=2) tenga solo permisos 1,2,3,5,6,7
DELETE FROM rol_permiso 
WHERE id_rol = 2 
AND id_permiso NOT IN (1, 2, 3, 5, 6, 7);

INSERT INTO rol_permiso (id_rol, id_permiso)
VALUES 
  (2, 1),
  (2, 2),
  (2, 3),
  (2, 5),
  (2, 6),
  (2, 7)
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Verificar resultado
SELECT 
  r.id_rol,
  r.nombre_rol,
  ARRAY_AGG(rp.id_permiso ORDER BY rp.id_permiso) as permisos_asignados
FROM rol r
LEFT JOIN rol_permiso rp ON r.id_rol = rp.id_rol
WHERE r.id_rol IN (1, 2)
GROUP BY r.id_rol, r.nombre_rol
ORDER BY r.id_rol;
