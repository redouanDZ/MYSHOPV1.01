-- Add multilingual columns to categories table
ALTER TABLE categories
  ADD COLUMN name_fr VARCHAR(120) NULL AFTER name,
  ADD COLUMN name_en VARCHAR(120) NULL AFTER name_fr;
