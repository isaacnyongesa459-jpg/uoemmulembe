CREATE TABLE IF NOT EXISTS scrape_runs (
  run_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('running', 'succeeded', 'partial', 'failed') NOT NULL,
  listings_seen INT UNSIGNED NOT NULL DEFAULT 0,
  candidates_created INT UNSIGNED NOT NULL DEFAULT 0,
  candidates_updated INT UNSIGNED NOT NULL DEFAULT 0,
  items_failed INT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(64) NULL,
  error_summary TEXT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id),
  KEY idx_scrape_runs_source_started (source_id, started_at),
  KEY idx_scrape_runs_status_started (status, started_at),
  CONSTRAINT fk_scrape_runs_source
    FOREIGN KEY (source_id) REFERENCES opportunity_sources (source_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
