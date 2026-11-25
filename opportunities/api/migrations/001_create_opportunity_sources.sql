CREATE TABLE IF NOT EXISTS opportunity_sources (
  source_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(200) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  homepage_url VARCHAR(2048) NOT NULL,
  robots_url VARCHAR(2048) NULL,
  terms_url VARCHAR(2048) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  policy_reviewed_at DATETIME NULL,
  last_successful_run_at DATETIME NULL,
  last_error_code VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (source_id),
  KEY idx_opportunity_sources_enabled (enabled, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
