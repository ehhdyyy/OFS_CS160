-- OFS Seed Data
-- Run this after schema.sql to set up test accounts and realistic demo data
-- Usage: mysql -u root -p < database/seed.sql
--
-- All test accounts use the password: admin123

USE ofs_db;

-- ── Users ──────────────────────────────────────────────────────────────────
-- Upsert test accounts (password: admin123 for all)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',         'admin@ofs.com',    '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'manager'),
  ('Test Employee', 'employee@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'employee'),
  ('Test Customer', 'customer@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role);

-- Extra demo customers
INSERT INTO users (name, email, password_hash, role, address) VALUES
  ('Maria Santos',  'maria@sjsu.edu',   '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '123 E San Fernando St, San Jose, CA 95112'),
  ('Kevin Nguyen',  'kevin@sjsu.edu',   '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '456 S 4th St, San Jose, CA 95112'),
  ('Emily Chen',    'emily@gmail.com',  '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '789 W San Carlos St, San Jose, CA 95126')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role);

-- For newer MySQL workbench versions where VALUES insert is deprecated
-- INSERT INTO users (name, email, password_hash, role) VALUES
--   ('Admin',         'admin@ofs.com',    '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'manager'),
--   ('Test Employee', 'employee@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'employee'),
--   ('Test Customer', 'customer@ofs.com', '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer'),
--   ('Maria Santos',  'maria@sjsu.edu',   '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '123 E San Fernando St, San Jose, CA 95112'),
--   ('Kevin Nguyen',  'kevin@sjsu.edu',   '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '456 S 4th St, San Jose, CA 95112'),
--   ('Emily Chen',    'emily@gmail.com',  '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W', 'customer', '789 W San Carlos St, San Jose, CA 95126') AS new
-- ON DUPLICATE KEY UPDATE
--   password_hash = new.password_hash,
--   role = new.role;

-- ── Products ───────────────────────────────────────────────────────────────
-- Clear existing products so we can re-seed cleanly
-- (schema.sql already inserted 5 products; this replaces them with a fuller set)
DELETE FROM inventory;
DELETE FROM order_items;
DELETE FROM products;
ALTER TABLE products AUTO_INCREMENT = 1;

INSERT INTO products (name, description, price, weight_lbs, category, is_available, is_organic, image_url) VALUES
  -- Fruit (6 items)
  ('Organic Apples',       'Crisp Fuji apples, locally grown',                4.99,  2.00, 'Fruit',     TRUE,  TRUE,  NULL),
  ('Organic Bananas',      'Fair-trade organic bananas, 1 bunch',             1.99,  1.00, 'Fruit',     TRUE,  TRUE,  NULL),
  ('Organic Strawberries', 'Sweet strawberries, 1 lb clamshell',              5.49,  1.00, 'Fruit',     TRUE,  TRUE,  NULL),
  ('Organic Blueberries',  'Antioxidant-rich blueberries, 6 oz',             4.29,  0.38, 'Fruit',     TRUE,  TRUE,  NULL),
  ('Organic Avocados',     'Hass avocados, bag of 4',                         6.99,  1.50, 'Fruit',     TRUE,  TRUE,  NULL),
  ('Organic Lemons',       'Bright Meyer lemons, bag of 6',                   3.49,  1.20, 'Fruit',     TRUE,  TRUE,  NULL),

  -- Vegetable (6 items)
  ('Organic Spinach',      'Baby spinach, 5 oz clamshell',                    3.99,  0.31, 'Vegetable', TRUE,  TRUE,  NULL),
  ('Organic Kale',         'Curly kale bunch, locally grown',                 2.99,  0.50, 'Vegetable', TRUE,  TRUE,  NULL),
  ('Organic Carrots',      'Whole carrots, 2 lb bag',                         3.49,  2.00, 'Vegetable', TRUE,  TRUE,  NULL),
  ('Organic Bell Peppers', 'Mixed bell peppers, 3 count',                     4.99,  1.10, 'Vegetable', TRUE,  TRUE,  NULL),
  ('Organic Broccoli',     'Fresh broccoli crowns, 1 lb',                     3.29,  1.00, 'Vegetable', TRUE,  TRUE,  NULL),
  ('Organic Sweet Potatoes','Orange sweet potatoes, 3 lb bag',                4.49,  3.00, 'Vegetable', TRUE,  TRUE,  NULL),

  -- Dairy (4 items)
  ('Organic Whole Milk',   '1 gallon, grass-fed',                             7.99, 10.00, 'Dairy',     TRUE,  TRUE,  NULL),
  ('Organic Greek Yogurt', 'Plain Greek yogurt, 32 oz',                       5.99,  2.00, 'Dairy',     TRUE,  TRUE,  NULL),
  ('Organic Cheddar',      'Sharp cheddar block, 8 oz',                       4.99,  0.50, 'Dairy',     TRUE,  TRUE,  NULL),
  ('Organic Eggs',         'Free-range large eggs, dozen',                    6.49,  1.50, 'Dairy',     TRUE,  TRUE,  NULL),

  -- Meat & Poultry (3 items)
  ('Organic Chicken Breast','Boneless skinless, 1 lb',                       10.99,  1.00, 'Meat & Poultry', TRUE, TRUE, NULL),
  ('Organic Ground Beef',   'Grass-fed 85/15 ground beef, 1 lb',            11.49,  1.00, 'Meat & Poultry', TRUE, TRUE, NULL),
  ('Organic Turkey Sausage','Mild Italian turkey sausage, 12 oz',             7.99,  0.75, 'Meat & Poultry', TRUE, TRUE, NULL),

  -- Bakery (3 items)
  ('Organic Sourdough',    'Artisan sourdough loaf',                          5.99,  1.50, 'Bakery',    TRUE,  TRUE,  NULL),
  ('Organic Multigrain',   'Sliced multigrain bread, 24 oz',                  4.49,  1.50, 'Bakery',    TRUE,  TRUE,  NULL),
  ('Organic Croissants',   'Butter croissants, 4 pack',                       6.99,  0.75, 'Bakery',    TRUE,  TRUE,  NULL),

  -- Pantry (4 items)
  ('Organic Granola',      'Honey oat granola, 12 oz bag',                    6.49,  0.75, 'Pantry',    TRUE,  TRUE,  NULL),
  ('Organic Olive Oil',    'Extra virgin olive oil, 16.9 oz',                 8.99,  1.10, 'Pantry',    TRUE,  TRUE,  NULL),
  ('Organic Pasta',        'Penne rigate, 16 oz box',                         2.99,  1.00, 'Pantry',    TRUE,  TRUE,  NULL),
  ('Organic Peanut Butter','Creamy peanut butter, 16 oz jar',                 5.49,  1.10, 'Pantry',    TRUE,  TRUE,  NULL),

  -- Beverages (3 items)
  ('Organic Orange Juice', 'Fresh-squeezed, not from concentrate, 52 oz',     6.99,  3.50, 'Beverage',  TRUE,  TRUE,  NULL),
  ('Organic Green Tea',    'Matcha green tea bags, 20 count',                  4.99,  0.20, 'Beverage',  TRUE,  TRUE,  NULL),
  ('Organic Kombucha',     'Ginger lemon kombucha, 16 oz bottle',             3.99,  1.10, 'Beverage',  TRUE,  TRUE,  NULL),

  -- Out-of-stock item (for testing)
  ('Organic Mangoes',      'Imported organic mangoes, 3 count',               7.49,  2.00, 'Fruit',     FALSE, TRUE,  NULL);


-- ── Inventory ──────────────────────────────────────────────────────────────
INSERT INTO inventory (product_id, quantity) VALUES
  (1,  50), (2,  80), (3,  35), (4,  40), (5,  25), (6,  45),
  (7,  60), (8,  55), (9,  70), (10, 30), (11, 40), (12, 35),
  (13, 20), (14, 28), (15, 42), (16, 36),
  (17, 18), (18, 15), (19, 22),
  (20, 25), (21, 30), (22, 20),
  (23, 30), (24, 38), (25, 50), (26, 33),
  (27, 24), (28, 45), (29, 28),
  (30,  0);  -- Mangoes out of stock


-- ── Robots ─────────────────────────────────────────────────────────────────
DELETE FROM robots;
INSERT INTO robots (name, status, battery_pct, max_weight_lbs, current_lat, current_lng) VALUES
  ('Robot-01', 'available',    100, 200.00, 37.3352, -121.8811),
  ('Robot-02', 'available',     87, 200.00, 37.3362, -121.8825),
  ('Robot-03', 'on_delivery',   64, 200.00, 37.3340, -121.8790),
  ('Robot-04', 'maintenance',   12, 200.00, NULL,     NULL),
  ('Robot-05', 'available',     95, 200.00, 37.3355, -121.8800);


-- ── Sample Orders (for demo) ───────────────────────────────────────────────
INSERT INTO orders (user_id, status, total_price, total_weight, delivery_fee, delivery_address, delivery_date, delivery_window) VALUES
  ((SELECT id FROM users WHERE email = 'customer@ofs.com'), 'delivered',        22.46,  4.31, 0.00, '321 S 1st St, San Jose, CA 95113',           '2026-03-15', '10:00 AM – 12:00 PM'),
  ((SELECT id FROM users WHERE email = 'maria@sjsu.edu'),  'delivered',        35.95, 15.50, 0.00, '123 E San Fernando St, San Jose, CA 95112',   '2026-03-16', '2:00 PM – 4:00 PM'),
  ((SELECT id FROM users WHERE email = 'kevin@sjsu.edu'),  'out_for_delivery', 48.93, 22.00, 10.00,'456 S 4th St, San Jose, CA 95112',             '2026-03-18', '11:00 AM – 1:00 PM'),
  ((SELECT id FROM users WHERE email = 'emily@gmail.com'), 'processing',       19.47,  3.81, 0.00, '789 W San Carlos St, San Jose, CA 95126',     '2026-03-19', '3:00 PM – 5:00 PM');

-- Sample order items
INSERT INTO order_items (order_id, product_id, name, price, weight_lbs, quantity) VALUES
  (1, 1, 'Organic Apples',   4.99, 2.00, 2),
  (1, 7, 'Organic Spinach',  3.99, 0.31, 1),
  (1, 2, 'Organic Bananas',  1.99, 1.00, 3),
  (2, 13,'Organic Whole Milk',7.99,10.00, 1),
  (2, 17,'Organic Chicken Breast',10.99,1.00,2),
  (2, 3, 'Organic Strawberries',5.49,1.00,1),
  (3, 13,'Organic Whole Milk',7.99,10.00, 2),
  (3, 18,'Organic Ground Beef',11.49,1.00,2),
  (3, 16,'Organic Eggs',      6.49, 1.50, 1),
  (4, 28,'Organic Green Tea', 4.99, 0.20, 2),
  (4, 25,'Organic Pasta',     2.99, 1.00, 1),
  (4, 26,'Organic Peanut Butter',5.49,1.10,1);

-- Sample revenue entries for delivered orders
INSERT INTO revenue (order_id, amount) VALUES
  (1, 22.46),
  (2, 35.95);