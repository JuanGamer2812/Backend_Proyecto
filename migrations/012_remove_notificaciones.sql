-- Migración 012: Eliminar sistema de notificaciones
-- Fecha: 2025-12-29
-- Descripción: Elimina triggers, funciones, vistas y tabla relacionadas con notificaciones

-- Eliminar triggers que llaman a funciones de notificaciones
DROP TRIGGER IF EXISTS trigger_notificar_reserva ON reserva;
DROP TRIGGER IF EXISTS trigger_notificar_pago ON pago;
DROP TRIGGER IF EXISTS trigger_notificar_confirmacion ON invitacion;
DROP TRIGGER IF EXISTS trigger_fecha_lectura ON notificacion;

-- Eliminar funciones de notificaciones y triggers auxiliares
DROP FUNCTION IF EXISTS notificar_nueva_reserva() CASCADE;
DROP FUNCTION IF EXISTS notificar_pago_completado() CASCADE;
DROP FUNCTION IF EXISTS notificar_confirmacion_asistencia() CASCADE;
DROP FUNCTION IF EXISTS crear_notificacion(p_user_id INTEGER, p_tipo VARCHAR, p_titulo VARCHAR, p_mensaje TEXT, p_datos JSONB, p_url VARCHAR, p_icono VARCHAR, p_prioridad VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS marcar_notificacion_leida(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS marcar_todas_leidas(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS limpiar_notificaciones_antiguas(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS obtener_notificaciones_usuario(INTEGER, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS actualizar_fecha_lectura() CASCADE;

-- Eliminar vistas relacionadas
DROP VIEW IF EXISTS v_notificaciones_no_leidas CASCADE;
DROP VIEW IF EXISTS v_estadisticas_notificaciones CASCADE;

-- Eliminar la tabla de notificaciones
DROP TABLE IF EXISTS notificacion CASCADE;

-- Comentario final
RAISE NOTICE 'Migración 012: Sistema de notificaciones eliminado (vistas/tabla/funciones/triggers).';
