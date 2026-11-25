CREATE TABLE IF NOT EXISTS opportunity_review_events (
  event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  opportunity_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action ENUM('approved', 'rejected', 'archived', 'reopened', 'updated') NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  previous_status ENUM('pending_verification', 'active', 'expired', 'archived') NULL,
  new_status ENUM('pending_verification', 'active', 'expired', 'archived') NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_review_events_opportunity_created (opportunity_id, created_at),
  KEY idx_review_events_actor_created (actor_id, created_at),
  CONSTRAINT fk_review_events_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
