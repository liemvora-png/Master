CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  description TEXT NOT NULL,
  price TEXT,
  position INTEGER NOT NULL UNIQUE CHECK (position > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS test_prep_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL CHECK (test_name IN ('SAT', 'AP')),
  subject TEXT NOT NULL CHECK (trim(subject) <> ''),
  position INTEGER NOT NULL CHECK (position > 0),
  UNIQUE (service_id, test_name, position),
  UNIQUE (service_id, test_name, subject)
);

CREATE TABLE IF NOT EXISTS photo_gallery (
  id TEXT PRIMARY KEY NOT NULL,
  image_url TEXT NOT NULL CHECK (trim(image_url) <> ''),
  alt_text TEXT NOT NULL CHECK (trim(alt_text) <> ''),
  caption TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (position)
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  exception_date TEXT,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS lesson_bookings (
  id TEXT PRIMARY KEY NOT NULL,
  service_id TEXT NOT NULL REFERENCES services(id),
  name TEXT NOT NULL CHECK (trim(name) <> ''),
  email TEXT NOT NULL CHECK (trim(email) <> ''),
  note TEXT NOT NULL DEFAULT '',
  lesson_date TEXT NOT NULL,
  lesson_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_bookings_active_slot
ON lesson_bookings (lesson_date, lesson_time)
WHERE status <> 'cancelled';

INSERT OR IGNORE INTO pages
  (id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title, updated_at)
VALUES
  ('services', 'services', 'Services', 'Liem Vora — Services',
   'Photography, private piano lessons, and SAT/AP tutoring.', 'Work together',
   '', 'Photography, private piano lessons, and SAT/AP tutoring.', '', CURRENT_TIMESTAMP),
  ('gallery', 'gallery', 'Photography', 'Liem Vora — Photography gallery',
   'A selection of photography by Liem Vora.', 'Selected work',
   '', 'A selection of photographs by Liem Vora.', '', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO services (id, title, description, price, position, active)
VALUES
  ('photography', 'Photography', 'Portraits, events, and thoughtful visual storytelling.', NULL, 1, 1),
  ('piano', 'Private piano lessons', 'One-on-one piano lessons tailored to each student.', NULL, 2, 1),
  ('tutoring', 'SAT / AP tutoring', 'Focused tutoring for SAT preparation and AP subjects.', NULL, 3, 1);

INSERT OR IGNORE INTO test_prep_options (service_id, test_name, subject, position)
VALUES
  ('tutoring', 'SAT', 'Math', 1),
  ('tutoring', 'SAT', 'Reading and Writing', 2),
  ('tutoring', 'AP', 'Biology', 1),
  ('tutoring', 'AP', 'Calculus AB', 2),
  ('tutoring', 'AP', 'Chemistry', 3),
  ('tutoring', 'AP', 'English Language and Composition', 4),
  ('tutoring', 'AP', 'Physics 1', 5),
  ('tutoring', 'AP', 'United States History', 6);

INSERT INTO nav_items (label, href, page_slug, position)
SELECT 'Services', '/services', 'services',
       (SELECT COALESCE(MAX(position), 0) + 1 FROM nav_items)
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE page_slug = 'services');
