CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  title_accent TEXT NOT NULL,
  description TEXT NOT NULL,
  section_title TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  type TEXT NOT NULL CHECK (type IN ('project', 'accomplishment', 'arrangement')),
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  UNIQUE (page_id, position)
);

CREATE TABLE IF NOT EXISTS nav_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL CHECK (trim(label) <> ''),
  href TEXT NOT NULL CHECK (trim(href) <> ''),
  page_slug TEXT NOT NULL REFERENCES pages(slug),
  position INTEGER NOT NULL UNIQUE CHECK (position > 0)
);

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'site'),
  brand TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  footer_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO pages
  (id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title, updated_at)
VALUES
  ('home', 'home', 'Liem Vora', 'Liem Vora',
   'The personal website of Liem Vora.', '', '', '', '', CURRENT_TIMESTAMP),
  ('projects', 'projects', 'A few things,', 'Liem Vora — Website projects',
   'A small index of Liem Vora''s website projects.', 'Independent projects',
   'made thoughtfully.',
   'A small collection of websites exploring design, flight, and the spaces we live in.',
   'My projects', CURRENT_TIMESTAMP),
  ('accomplishments', 'accomplishments', 'Built through', 'Liem Vora — Accomplishments',
   'Selected accomplishments across music, athletics, and coaching.', 'Selected highlights',
   'practice and play.',
   'A few milestones across music, athletics, and teaching.',
   'Accomplishments', CURRENT_TIMESTAMP),
  ('arrangements', 'arrangements', 'Sheet music', 'Liem Vora — Sheet music arrangements',
   'Sheet music arrangements by Liem Vora.', 'Music',
   'arrangements.',
   'A collection of arrangements for musicians and ensembles.',
   'Arrangements', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO blocks (page_id, position, type, content)
VALUES
  ('projects', 1, 'project', '{"name":"SKYWARD","description":"A study in regional aircraft design.","category":"AEROSPACE","url":"https://aerospace.liemvora.cc"}'),
  ('projects', 2, 'project', '{"name":"LHANA","description":"Thoughtful interiors, made for everyday life.","category":"INTERIOR DESIGN","url":"https://lhana.liemvora.cc"}');

INSERT OR IGNORE INTO nav_items (label, href, page_slug, position)
VALUES
  ('Home', '/', 'home', 1),
  ('Projects', '/projects', 'projects', 2),
  ('Accomplishments', '/accomplishments.html', 'accomplishments', 3),
  ('Arrangements', '/arrangements.html', 'arrangements', 4);

INSERT OR IGNORE INTO site_settings (id, brand, labels_json, footer_json, updated_at)
VALUES (
  'site',
  'Liem Vora',
  '{"projectLink":"Visit website","arrangementLink":"View arrangement","emptyArrangements":"Arrangements will be added here."}',
  '{"label":"δ","note":"MADE WITH CARE","year":"2026"}',
  CURRENT_TIMESTAMP
);
