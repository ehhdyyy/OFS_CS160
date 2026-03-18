-- OFS Seed Data
-- Run this after schema.sql to set up test accounts
-- Usage: /usr/local/mysql/bin/mysql -u root -p < database/seed.sql
--
-- All test accounts use the password: admin123

USE ofs_db;

INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',         'admin@ofs.com',    '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'manager'),
  ('Test Employee', 'employee@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'employee'),
  ('Test Customer', 'customer@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role);
