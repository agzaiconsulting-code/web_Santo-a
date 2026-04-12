-- ============================================================
-- MIGRACIÓN 004: Seed — 7 familias y 21 miembros reales
-- EJECUTAR UNA SOLA VEZ después de 001_schema.sql
-- Los clerk_user_id se rellenan al primer login de cada usuario.
-- Los emails @placeholder.local se actualizan cuando el admin
-- crea las cuentas en Clerk con los correos reales.
-- ============================================================

-- Familias
INSERT INTO families (id, name) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Familia Terina'),
  ('f1000000-0000-0000-0000-000000000002', 'Familia Rafa'),
  ('f1000000-0000-0000-0000-000000000003', 'Familia Amalia'),
  ('f1000000-0000-0000-0000-000000000004', 'Familia Ramón'),
  ('f1000000-0000-0000-0000-000000000005', 'Familia Carlos'),
  ('f1000000-0000-0000-0000-000000000006', 'Familia Luis'),
  ('f1000000-0000-0000-0000-000000000007', 'Familia Ignacio')
ON CONFLICT (id) DO NOTHING;

-- Familia Terina
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Moncho', 'Terina', 'f1000000-0000-0000-0000-000000000001', 'moncho@placeholder.local'),
  ('Rafa',   'Terina', 'f1000000-0000-0000-0000-000000000001', 'rafa.terina@placeholder.local');

-- Familia Rafa
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Susana',     'Rafa', 'f1000000-0000-0000-0000-000000000002', 'susana@placeholder.local'),
  ('Cristina',   'Rafa', 'f1000000-0000-0000-0000-000000000002', 'cristina@placeholder.local'),
  ('Jose María', 'Rafa', 'f1000000-0000-0000-0000-000000000002', 'josemaria@placeholder.local'),
  ('Tere',       'Rafa', 'f1000000-0000-0000-0000-000000000002', 'tere@placeholder.local'),
  ('Pachi',      'Rafa', 'f1000000-0000-0000-0000-000000000002', 'pachi@placeholder.local');

-- Familia Amalia
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Amalia',   'Amalia', 'f1000000-0000-0000-0000-000000000003', 'amalia@placeholder.local'),
  ('Feliz',    'Amalia', 'f1000000-0000-0000-0000-000000000003', 'feliz@placeholder.local'),
  ('María',    'Amalia', 'f1000000-0000-0000-0000-000000000003', 'maria.amalia@placeholder.local'),
  ('Beatriz',  'Amalia', 'f1000000-0000-0000-0000-000000000003', 'beatriz@placeholder.local'),
  ('Santiago', 'Amalia', 'f1000000-0000-0000-0000-000000000003', 'santiago@placeholder.local');

-- Familia Ramón
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Anusca',    'Ramón', 'f1000000-0000-0000-0000-000000000004', 'anusca@placeholder.local'),
  ('Carmela',   'Ramón', 'f1000000-0000-0000-0000-000000000004', 'carmela@placeholder.local'),
  ('Ramonin',   'Ramón', 'f1000000-0000-0000-0000-000000000004', 'ramonin@placeholder.local'),
  ('Francisco', 'Ramón', 'f1000000-0000-0000-0000-000000000004', 'francisco@placeholder.local');

-- Familia Carlos
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Alicia', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'alicia@placeholder.local'),
  ('Olga',   'Carlos', 'f1000000-0000-0000-0000-000000000005', 'olga@placeholder.local'),
  ('Carlos', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'carlos@placeholder.local'),
  ('Javier', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'javier@placeholder.local');

-- Familia Luis (Adrian es administrador)
INSERT INTO users (first_name, last_name, family_id, email, role) VALUES
  ('Ignacio', 'Luis',  'f1000000-0000-0000-0000-000000000006', 'ignacio.luis@placeholder.local', 'user'),
  ('Kike',    'Luis',  'f1000000-0000-0000-0000-000000000006', 'kike@placeholder.local',          'user'),
  ('Ramon',   'Luis',  'f1000000-0000-0000-0000-000000000006', 'ramountainbike@gmail.com',        'user'),
  ('Nano',    'Luis',  'f1000000-0000-0000-0000-000000000006', 'nano@placeholder.local',          'user'),
  ('Adrian',  'Gómez', 'f1000000-0000-0000-0000-000000000006', 'adrian.gomez.dejuan@gmail.com',  'admin');

-- Familia Ignacio
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Tate', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'tate@placeholder.local'),
  ('Viki', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'viki@placeholder.local'),
  ('Oje',  'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'oje@placeholder.local');
