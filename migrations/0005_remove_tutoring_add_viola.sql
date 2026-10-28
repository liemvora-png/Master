BEGIN;

DELETE FROM test_prep_options
WHERE service_id = 'tutoring';

DELETE FROM services
WHERE id = 'tutoring';

INSERT OR IGNORE INTO services (id, title, description, price, position, active)
VALUES
  ('viola', 'Private viola lessons', 'One-on-one viola lessons tailored to each student.', NULL, 3, 1);

UPDATE services
SET title = 'Private piano lessons',
    description = 'One-on-one piano lessons tailored to each student.',
    position = 2
WHERE id = 'piano';

UPDATE pages
SET meta_description = 'Photography, private piano lessons, and viola lessons.',
    description = 'Photography, piano lessons, and viola lessons.'
WHERE id = 'services';

COMMIT;
