-- ============================================================
-- MIGRACIÓN 005: Seed inicial de fotos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

INSERT INTO photos (storage_path, url, sort_order) VALUES
  ('images/WhatsApp Image 2026-04-12 at 21.37.07 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.07 (1).jpeg', 1),
  ('images/WhatsApp Image 2026-04-12 at 21.37.07.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.07.jpeg',     2),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (1).jpeg', 3),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (2).jpeg', 4),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (3).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (3).jpeg', 5),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (4).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (4).jpeg', 6),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (5).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (5).jpeg', 7),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (6).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (6).jpeg', 8),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (7).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (7).jpeg', 9),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (8).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (8).jpeg', 10),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (9).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (9).jpeg', 11),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.08.jpeg',     12),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (1).jpeg', 13),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (2).jpeg', 14),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (3).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (3).jpeg', 15),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (4).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (4).jpeg', 16),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (5).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (5).jpeg', 17),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (6).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (6).jpeg', 18),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (7).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (7).jpeg', 19),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.09.jpeg',     20),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.10 (1).jpeg', 21),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.10 (2).jpeg', 22),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.10.jpeg',     23),
  ('images/WhatsApp Image 2026-04-13 at 01.03.14.jpeg',     '/images/WhatsApp Image 2026-04-13 at 01.03.14.jpeg',     24)
ON CONFLICT DO NOTHING;
