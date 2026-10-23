UPDATE site_settings
SET brand = 'Liem Vora',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'site'
  AND brand = 'δ';
