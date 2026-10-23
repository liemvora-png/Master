DELETE FROM nav_items;

UPDATE pages
SET slug = 'projects'
WHERE id = 'projects';

INSERT OR IGNORE INTO pages
  (id, slug, title, meta_title, meta_description, eyebrow, title_accent, description, section_title, updated_at)
VALUES
  ('home', 'home', 'Liem Vora', 'Liem Vora',
   'The personal website of Liem Vora.', '', '', '', '', CURRENT_TIMESTAMP);

DELETE FROM blocks
WHERE page_id = 'accomplishments'
  AND type = 'accomplishment';

INSERT INTO nav_items (label, href, page_slug, position)
VALUES
  ('Home', '/', 'home', 1),
  ('Projects', '/projects', 'projects', 2),
  ('Accomplishments', '/accomplishments.html', 'accomplishments', 3),
  ('Arrangements', '/arrangements.html', 'arrangements', 4);

UPDATE site_settings
SET brand = 'δ',
    footer_json = json_set(footer_json, '$.label', 'δ'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'site';
