-- ============================================================
-- MIGRACIÓN 002: Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE august_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos            ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Funciones helper
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_app_user_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub');
$$;

CREATE OR REPLACE FUNCTION get_current_app_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub');
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(get_current_app_user_role() = 'admin', false);
$$;

-- -------------------------------------------------------
-- Políticas: families (lectura pública)
-- -------------------------------------------------------
CREATE POLICY "families_select_all"
  ON families FOR SELECT USING (true);

-- -------------------------------------------------------
-- Políticas: users
-- -------------------------------------------------------
CREATE POLICY "users_select_own_or_admin"
  ON users FOR SELECT
  USING (clerk_user_id = (auth.jwt() ->> 'sub') OR is_admin());

-- -------------------------------------------------------
-- Políticas: august_assignments
-- -------------------------------------------------------
CREATE POLICY "august_select_all"
  ON august_assignments FOR SELECT USING (true);

CREATE POLICY "august_insert_admin"
  ON august_assignments FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "august_update_admin"
  ON august_assignments FOR UPDATE USING (is_admin());

-- -------------------------------------------------------
-- Políticas: reservations
-- -------------------------------------------------------
CREATE POLICY "reservations_select_authenticated"
  ON reservations FOR SELECT
  USING (auth.jwt() IS NOT NULL);

CREATE POLICY "reservations_insert_authenticated"
  ON reservations FOR INSERT
  WITH CHECK (auth.jwt() IS NOT NULL);

CREATE POLICY "reservations_update_own_or_admin"
  ON reservations FOR UPDATE
  USING (user_id = get_current_app_user_id() OR is_admin());

-- -------------------------------------------------------
-- Políticas: audit_log
-- -------------------------------------------------------
CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT USING (is_admin());

CREATE POLICY "audit_log_insert_service"
  ON audit_log FOR INSERT WITH CHECK (true);  -- Solo via service_role desde RPC

-- -------------------------------------------------------
-- Políticas: photos
-- -------------------------------------------------------
CREATE POLICY "photos_select_all"
  ON photos FOR SELECT USING (true);

CREATE POLICY "photos_insert_admin"
  ON photos FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "photos_update_admin"
  ON photos FOR UPDATE USING (is_admin());

CREATE POLICY "photos_delete_admin"
  ON photos FOR DELETE USING (is_admin());
