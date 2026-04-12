-- ============================================================
-- MIGRACIÓN 001: Schema completo Casa Cervantes
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- families
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS families (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id         TEXT UNIQUE,          -- NULL hasta primer login
  email                 TEXT NOT NULL DEFAULT '',
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  family_id             UUID REFERENCES families(id),  -- NULL hasta asignación
  role                  TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  receive_notifications BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- august_assignments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS august_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INTEGER NOT NULL,
  family_id   UUID NOT NULL REFERENCES families(id),
  assigned_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year)
);

-- -------------------------------------------------------
-- reservations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  nights      INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS ((check_out - check_in) * 30) STORED,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT valid_dates           CHECK (check_out > check_in),
  CONSTRAINT max_consecutive_nights CHECK ((check_out - check_in) <= 15)
);

-- -------------------------------------------------------
-- audit_log
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  action         TEXT NOT NULL CHECK (action IN (
                   'reservation_created',
                   'reservation_cancelled',
                   'reservation_modified'
                 )),
  reservation_id UUID REFERENCES reservations(id),
  details        JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- photos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  url          TEXT NOT NULL,
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  uploaded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- Vista: accounting_summary
-- -------------------------------------------------------
CREATE OR REPLACE VIEW accounting_summary AS
SELECT
  f.id                                   AS family_id,
  f.name                                 AS family_name,
  EXTRACT(YEAR  FROM r.check_in)::INTEGER AS year,
  EXTRACT(MONTH FROM r.check_in)::INTEGER AS month,
  COUNT(r.id)                            AS total_reservations,
  SUM(r.nights)                          AS total_nights,
  SUM(r.total_price)                     AS total_income
FROM reservations r
JOIN users    u ON r.user_id    = u.id
JOIN families f ON u.family_id  = f.id
WHERE r.status = 'active'
GROUP BY f.id, f.name,
  EXTRACT(YEAR  FROM r.check_in),
  EXTRACT(MONTH FROM r.check_in)
ORDER BY year, month, f.name;

-- -------------------------------------------------------
-- Índices de rendimiento
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservations_status      ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in    ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out   ON reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id     ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id      ON users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_family_id          ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reservation_id ON audit_log(reservation_id);
CREATE INDEX IF NOT EXISTS idx_photos_sort_order        ON photos(sort_order);
