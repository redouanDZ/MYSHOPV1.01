-- Migration 015: Create Newsletter Subscribers Table and Seed VIP Discount Coupon

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(191) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'vip_club',
    discount_code VARCHAR(50) NOT NULL DEFAULT 'PROMO10',
    status ENUM('active', 'unsubscribed') NOT NULL DEFAULT 'active',
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscribers_email (email),
    KEY idx_subscribers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure PROMO10 coupon exists in coupons table with 10% discount
INSERT INTO coupons (code, discount_percent, discount_amount, min_order_amount, max_uses, uses_count, status)
VALUES ('PROMO10', 10.00, 0.00, 0.00, 1000, 0, 'active')
ON DUPLICATE KEY UPDATE status = 'active', discount_percent = 10.00;
