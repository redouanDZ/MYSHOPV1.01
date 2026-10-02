-- Migration 005: Add Product Filter Indexes for Rating and Stock

ALTER TABLE products ADD INDEX idx_products_rating (rating);
ALTER TABLE products ADD INDEX idx_products_stock (stock);
