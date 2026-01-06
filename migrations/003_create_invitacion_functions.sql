-- Migration: Crear/actualizar funciones de invitación
BEGIN;

CREATE OR REPLACE FUNCTION public.generar_codigo_invitacion() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  codigo VARCHAR;
  existe BOOLEAN;
BEGIN
  LOOP
    codigo := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    SELECT EXISTS(SELECT 1 FROM invitacion WHERE codigo_unico = codigo) INTO existe;
    EXIT WHEN NOT existe;
  END LOOP;
  RETURN codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_invitacion(p_id_evento integer, p_nombre_invitado character varying, p_email character varying, p_telefono character varying DEFAULT NULL::character varying, p_numero_acompanantes integer DEFAULT 0, p_mensaje_personalizado text DEFAULT NULL::text, p_categoria character varying DEFAULT NULL::character varying) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_invitacion_id BIGINT;
  v_codigo VARCHAR;
BEGIN
  v_codigo := generar_codigo_invitacion();

  INSERT INTO invitacion(
    id_evento, nombre_invitado, email, telefono,
    codigo_unico, numero_acompanantes, mensaje_personalizado, categoria
  ) VALUES (
    p_id_evento, p_nombre_invitado, p_email, p_telefono,
    v_codigo, p_numero_acompanantes, p_mensaje_personalizado, p_categoria
  )
  RETURNING id_invitacion INTO v_invitacion_id;

  RETURN v_invitacion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_asistencia(p_codigo_unico character varying, p_acompanantes_confirmados integer, p_restricciones_alimentarias text DEFAULT NULL::text, p_ip_confirmacion inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_inv invitacion%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM invitacion WHERE codigo_unico = p_codigo_unico;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación no válido';
  END IF;

  IF p_acompanantes_confirmados > v_inv.numero_acompanantes THEN
    RAISE EXCEPTION 'Número de acompañantes excede el permitido';
  END IF;

  UPDATE invitacion
  SET estado='confirmado',
      acompanantes_confirmados=p_acompanantes_confirmados,
      restricciones_alimentarias=p_restricciones_alimentarias,
      ip_confirmacion=p_ip_confirmacion,
      user_agent_confirmacion=p_user_agent
  WHERE codigo_unico = p_codigo_unico;

  RETURN TRUE;
END;
$$;

COMMIT;
