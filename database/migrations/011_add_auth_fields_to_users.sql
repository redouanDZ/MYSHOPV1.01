ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(128) NULL;
ALTER TABLE users ADD COLUMN verification_token_expires DATETIME NULL;
ALTER TABLE users ADD COLUMN reset_token VARCHAR(128) NULL;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL;

-- Grandfather in existing users as verified
UPDATE users SET is_verified = TRUE;
