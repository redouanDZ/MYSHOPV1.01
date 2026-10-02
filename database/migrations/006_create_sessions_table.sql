-- Migration 006: Create Sessions Table for Persistent and Secure Session Management

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    user_agent VARCHAR(255) DEFAULT 'unknown',
    ip VARCHAR(64) DEFAULT 'unknown',
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    expires_at BIGINT UNSIGNED NOT NULL,
    last_seen BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_expires (expires_at),
    KEY idx_sessions_revoked (revoked),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
