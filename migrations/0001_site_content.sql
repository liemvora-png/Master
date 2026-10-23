CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'site'),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO site_content (id, content_json, updated_at)
VALUES (
  'site',
  '{
    "brand": "LIEM VORA",
    "navigation": [
      {"label": "Projects", "href": "index.html", "page": "projects"},
      {"label": "Accomplishments", "href": "accomplishments.html", "page": "accomplishments"},
      {"label": "Arrangements", "href": "arrangements.html", "page": "arrangements"}
    ],
    "labels": {
      "projectLink": "Visit website",
      "arrangementLink": "View arrangement",
      "emptyArrangements": "Arrangements will be added here."
    },
    "pages": {
      "projects": {
        "metaTitle": "Liem Vora — Website projects",
        "metaDescription": "A small index of Liem Vora''s website projects.",
        "eyebrow": "Independent projects",
        "title": "A few things,",
        "titleAccent": "made thoughtfully.",
        "description": "A small collection of websites exploring design, flight, and the spaces we live in.",
        "sectionTitle": "My projects",
        "items": [
          {"name": "SKYWARD", "description": "A study in regional aircraft design.", "category": "AEROSPACE", "url": "https://aerospace.liemvora.cc"},
          {"name": "LHANA", "description": "Thoughtful interiors, made for everyday life.", "category": "INTERIOR DESIGN", "url": "https://lhana.liemvora.cc"}
        ]
      },
      "accomplishments": {
        "metaTitle": "Liem Vora — Accomplishments",
        "metaDescription": "Selected accomplishments across music, athletics, and coaching.",
        "eyebrow": "Selected highlights",
        "title": "Built through",
        "titleAccent": "practice and play.",
        "description": "A few milestones across music, athletics, and teaching.",
        "sectionTitle": "Accomplishments",
        "items": [
          {"name": "Ponce Project piano competition", "detail": "3rd place"},
          {"name": "Founded a six-person string ensemble", "detail": "5K+ revenue"},
          {"name": "Varsity water polo", "detail": "2 years"},
          {"name": "Swim coach", "detail": "400+ students"},
          {"name": "AFA Symphony", "detail": "Qualifier"}
        ]
      },
      "arrangements": {
        "metaTitle": "Liem Vora — Sheet music arrangements",
        "metaDescription": "Sheet music arrangements by Liem Vora.",
        "eyebrow": "Music",
        "title": "Sheet music",
        "titleAccent": "arrangements.",
        "description": "A collection of arrangements for musicians and ensembles.",
        "sectionTitle": "Arrangements",
        "items": []
      }
    },
    "footer": {
      "label": "LIEM VORA",
      "note": "MADE WITH CARE",
      "year": "2026"
    }
  }',
  CURRENT_TIMESTAMP
);
