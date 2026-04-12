-- ============================================================
-- MIGRACIÓN 003: Funciones RPC
-- ============================================================

-- -------------------------------------------------------
-- create_reservation
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION create_reservation(
  p_user_id  UUID,
  p_check_in  DATE,
  p_check_out DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id   UUID;
  v_user_family_id   UUID;
  v_august_family_id UUID;
  v_current_year     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nights           INTEGER := p_check_out - p_check_in;
  v_family_nights    INTEGER;
BEGIN
  -- 1. Fecha de entrada no en el pasado
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de entrada no puede ser en el pasado';
  END IF;

  -- 2. Año natural
  IF EXTRACT(YEAR FROM p_check_in)::INTEGER != v_current_year
     OR EXTRACT(YEAR FROM p_check_out)::INTEGER != v_current_year THEN
    -- Excepción: check_out = 1 ene año siguiente con check_in = 31 dic
    IF NOT (p_check_out = make_date(v_current_year + 1, 1, 1)
            AND EXTRACT(YEAR FROM p_check_in)::INTEGER = v_current_year) THEN
      RAISE EXCEPTION 'Solo se puede reservar dentro del año natural actual';
    END IF;
  END IF;

  -- 3. Antelación máxima 4 meses
  IF p_check_in > CURRENT_DATE + INTERVAL '4 months' THEN
    RAISE EXCEPTION 'No se puede reservar con más de 4 meses de antelación';
  END IF;

  -- 4. Máximo 15 noches
  IF v_nights > 15 THEN
    RAISE EXCEPTION 'Máximo 15 noches consecutivas';
  END IF;

  -- 5. Sin solapamiento
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE status = 'active'
      AND check_in  < p_check_out
      AND check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas ya están reservadas';
  END IF;

  -- 6. Cuota familiar (máx. 30 noches en ventana de 4 meses)
  SELECT family_id INTO v_user_family_id FROM users WHERE id = p_user_id;

  IF v_user_family_id IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no tiene una familia asignada. Contacta con el administrador.';
  END IF;

  SELECT COALESCE(SUM(r.nights), 0)::INTEGER INTO v_family_nights
  FROM reservations r
  JOIN users u ON r.user_id = u.id
  WHERE u.family_id = v_user_family_id
    AND r.status    = 'active'
    AND r.check_in  < CURRENT_DATE + INTERVAL '4 months'
    AND r.check_out > CURRENT_DATE;

  IF v_family_nights + v_nights > 30 THEN
    RAISE EXCEPTION
      'Tu familia ya tiene % noches reservadas. El máximo es 30 noches en los próximos 4 meses. Solo puedes añadir % noches más.',
      v_family_nights, (30 - v_family_nights);
  END IF;

  -- 7. Restricción agosto
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

  -- 8. Insertar reserva
  INSERT INTO reservations (user_id, check_in, check_out)
  VALUES (p_user_id, p_check_in, p_check_out)
  RETURNING id INTO v_reservation_id;

  -- 9. Audit log
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

-- -------------------------------------------------------
-- cancel_reservation
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_user_id        UUID,
  p_reservation_id UUID,
  p_is_admin       BOOLEAN DEFAULT false
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada o ya cancelada';
  END IF;

  IF v_reservation.user_id != p_user_id AND NOT p_is_admin THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar esta reserva';
  END IF;

  UPDATE reservations
  SET status       = 'cancelled',
      cancelled_at = now(),
      updated_at   = now()
  WHERE id = p_reservation_id;

  INSERT INTO audit_log (user_id, action, reservation_id, details)
  VALUES (
    p_user_id,
    'reservation_cancelled',
    p_reservation_id,
    jsonb_build_object(
      'check_in',          v_reservation.check_in,
      'check_out',         v_reservation.check_out,
      'cancelled_by_admin', p_is_admin
    )
  );

  RETURN true;
END;
$$;

-- -------------------------------------------------------
-- get_family_quota
-- Noches usadas por familia en la ventana de 4 meses
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_family_quota(p_family_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(SUM(r.nights), 0)::INTEGER
  FROM reservations r
  JOIN users u ON r.user_id = u.id
  WHERE u.family_id = p_family_id
    AND r.status    = 'active'
    AND r.check_in  < CURRENT_DATE + INTERVAL '4 months'
    AND r.check_out > CURRENT_DATE;
$$;
