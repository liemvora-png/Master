CREATE INDEX IF NOT EXISTS idx_news_items_published_at
  ON news_items(published_at);

CREATE INDEX IF NOT EXISTS idx_news_items_active_position
  ON news_items(active, position);
