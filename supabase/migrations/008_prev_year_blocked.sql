-- ============================================================
-- MIGRACIÓN 008: Añadir restricción de días ya disfrutados
--                el año anterior por el mismo usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE OR REPLACE FUNCTION create_reservation(
  p_user_id         UUID,
  p_check_in        DATE,
  p_check_out       DATE,
  p_caller_is_admin BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id   UUID;
  v_user_family_id   UUID;
  v_august_family_id UUID;
  v_current_year     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nights           INTEGER := p_check_out - p_check_in;
BEGIN
  -- 1. Fecha de entrada no en el pasado
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de entrada no puede ser en el pasado';
  END IF;

  -- 2. Año natural
  IF EXTRACT(YEAR FROM p_check_in)::INTEGER != v_current_year
     OR EXTRACT(YEAR FROM p_check_out)::INTEGER != v_current_year THEN
    IF NOT (p_check_out = make_date(v_current_year + 1, 1, 1)
            AND EXTRACT(YEAR FROM p_check_in)::INTEGER = v_current_year) THEN
      RAISE EXCEPTION 'Solo se puede reservar dentro del año natural actual';
    END IF;
  END IF;

  -- 3. Antelación máxima 4 meses
  IF p_check_in > CURRENT_DATE + INTERVAL '4 months' THEN
    RAISE EXCEPTION 'No se puede reservar con más de 4 meses de antelación';
  END IF;

  -- 4. Máximo 15 noches consecutivas
  IF v_nights > 15 THEN
    RAISE EXCEPTION 'Máximo 15 noches consecutivas';
  END IF;

  -- 5. Sin solapamiento con reservas activas
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE status    = 'active'
      AND check_in  < p_check_out
      AND check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas ya están reservadas';
  END IF;

  -- 6. Máximo 1 reserva activa en curso por usuario no-admin
  IF NOT p_caller_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE user_id  = p_user_id
        AND status   = 'active'
        AND check_out > CURRENT_DATE
    ) THEN
      RAISE EXCEPTION 'No puedes realizar otra reserva debido a que tienes una reserva activa.';
    END IF;
  END IF;

  -- 7. Mismos días disfrutados el año anterior (solo no-admin)
  IF NOT p_caller_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE user_id  = p_user_id
        AND status   = 'active'
        AND check_in  < (p_check_out - INTERVAL '1 year')
        AND check_out > (p_check_in  - INTERVAL '1 year')
    ) THEN
      RAISE EXCEPTION 'No puedes reservar fechas que ya disfrutaste el año anterior';
    END IF;
  END IF;

  -- 8. Familia del usuario
  SELECT family_id INTO v_user_family_id FROM users WHERE id = p_user_id;

  IF v_user_family_id IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no tiene una familia asignada. Contacta con el administrador.';
  END IF;

  -- 9. Restricción agosto
  IF EXTRACT(MONTH FROM p_check_in) = 8
     OR (p_check_out > make_date(v_current_year, 8, 1)
         AND p_check_in < make_date(v_current_year, 9, 1)) THEN

    SELECT family_id INTO v_august_family_id
    FROM august_assignments
    WHERE year = v_current_year;

    IF v_august_family_id IS NULL THEN
      RAISE EXCEPTION 'No se ha asignado familia para agosto de este año. Contacta con el administrador.';
    END IF;

    IF v_user_family_id != v_august_family_id THEN
      RAISE EXCEPTION 'Solo la familia asignada puede reservar en agosto';
    END IF;
  END IF;

  -- 10. Insertar reserva
  INSERT INTO reservations (user_id, check_in, check_out)
  VALUES (p_user_id, p_check_in, p_check_out)
  RETURNING id INTO v_reservation_id;

  -- 11. Audit log
  INSERT INTO audit_log (user_id, action, reservation_id, details)
  VALUES (
    p_user_id,
    'reservation_created',
    v_reservation_id,
    jsonb_build_object(
      'check_in',    p_check_in,
      'check_out',   p_check_out,
      'nights',      v_nights,
      'total_price', v_nights * 30
    )
  );

  RETURN v_reservation_id;
END;
$$;
