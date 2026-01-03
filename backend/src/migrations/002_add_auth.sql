-- Add authentication fields to users table
ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);