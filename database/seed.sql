-- OFS minimal seed data
-- Seeds only core login/demo records and catalog/fleet setup.
-- No deliveries, orders, order_items, carts, or financial history.

USE ofs_db;

SET @demo_hash = '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W';

-- Users
INSERT INTO users (id, name, email, password_hash, role, is_lead_admin, address, created_at) VALUES
  (1, 'Admin',         'admin@ofs.com',    @demo_hash, 'manager',  TRUE,  '97 S Second St, San Jose, CA 95113',          '2026-03-30 08:00:00'),
  (2, 'Test Employee', 'employee@ofs.com', @demo_hash, 'employee', FALSE, '1 Washington Sq, San Jose, CA 95192',         '2026-03-30 08:05:00'),
  (3, 'Test Customer', 'customer@ofs.com', @demo_hash, 'customer', FALSE, '95 Paseo de San Antonio, San Jose, CA 95113', '2026-03-30 08:10:00');

-- Products
INSERT INTO products (id, name, description, price, cost_price, weight_lbs, category, is_organic, image_url, created_at) VALUES
  (1,  'Apples',         'Crisp Fuji apples, 2 lb bag',             4.99, 3.10, 2.00, 'Fruit',     TRUE,  '/products/apples.jpg',         '2026-03-30 09:00:00'),
  (2,  'Bananas',        'Fresh bananas, 1 bunch',                  1.99, 1.10, 1.00, 'Fruit',     TRUE,  '/products/bananas.jpg',        '2026-03-30 09:01:00'),
  (3,  'Strawberries',   'Sweet strawberries, 1 lb clamshell',      5.49, 3.50, 1.00, 'Fruit',     TRUE,  '/products/strawberries.jpg',   '2026-03-30 09:02:00'),
  (4,  'Avocados',       'Hass avocados, bag of 4',                 6.99, 4.20, 1.50, 'Fruit',     TRUE,  '/products/avocados.jpg',       '2026-03-30 09:03:00'),
  (5,  'Spinach',        'Baby spinach, 5 oz clamshell',            3.99, 2.30, 0.31, 'Vegetable', TRUE,  '/products/spinach.jpg',        '2026-03-30 09:04:00'),
  (6,  'Carrots',        'Whole carrots, 2 lb bag',                 3.49, 1.70, 2.00, 'Vegetable', TRUE,  '/products/carrots.jpg',        '2026-03-30 09:05:00'),
  (7,  'Bell Peppers',   'Mixed bell peppers, 3 count',             4.99, 2.80, 1.10, 'Vegetable', TRUE,  '/products/bell-peppers.jpg',   '2026-03-30 09:06:00'),
  (8,  'Broccoli',       'Fresh broccoli crowns, 1 lb',             3.29, 1.85, 1.00, 'Vegetable', TRUE,  '/products/broccoli.jpg',       '2026-03-30 09:07:00'),
  (9,  'Whole Milk',     '1 gallon whole milk',                     7.99, 5.10,10.00, 'Dairy',     TRUE,  '/products/whole-milk.jpg',     '2026-03-30 09:08:00'),
  (10, 'Greek Yogurt',   'Plain Greek yogurt, 32 oz',               5.99, 3.75, 2.00, 'Dairy',     TRUE,  '/products/greek-yogurt.jpg',   '2026-03-30 09:09:00'),
  (11, 'Eggs',           'Free-range large eggs, dozen',            6.49, 4.10, 1.50, 'Dairy',     TRUE,  '/products/eggs.jpg',           '2026-03-30 09:10:00'),
  (12, 'Chicken Breast', 'Boneless skinless chicken breast, 1 lb', 10.99, 7.20, 1.00, 'Meat',      TRUE,  '/products/chicken-breast.jpg', '2026-03-30 09:11:00'),
  (13, 'Sourdough',      'Artisan sourdough loaf',                  5.99, 3.25, 1.50, 'Bakery',    TRUE,  '/products/sourdough.jpg',      '2026-03-30 09:12:00'),
  (14, 'Pasta',          'Penne rigate, 16 oz box',                 2.99, 1.45, 1.00, 'Pantry',    TRUE,  '/products/pasta.jpg',          '2026-03-30 09:13:00'),
  (15, 'Olive Oil',      'Extra virgin olive oil, 16.9 oz',         8.99, 5.90, 1.10, 'Pantry',    TRUE,  '/products/olive-oil.jpg',      '2026-03-30 09:14:00'),
  (16, 'Orange Juice',   'Fresh orange juice, 52 oz',               6.99, 4.15, 3.50, 'Beverage',  TRUE,  '/products/orange-juice.jpg',   '2026-03-30 09:15:00'),
  (17, 'Granola',        'Honey oat granola, 12 oz bag',            6.49, 3.95, 0.75, 'Pantry',    TRUE,  '/products/granola.jpg',        '2026-03-30 09:16:00'),
  (18, 'Kombucha',       'Ginger lemon kombucha, 16 oz bottle',     3.99, 2.10, 1.10, 'Beverage',  TRUE,  '/products/kombucha.jpg',       '2026-03-30 09:17:00');

-- Inventory
INSERT INTO inventory (product_id, quantity, low_stock_threshold) VALUES
  (1,  22, 10),
  (2,  28, 10),
  (3,   8,  6),
  (4,   7,  6),
  (5,   5,  5),
  (6,  16,  8),
  (7,   9,  6),
  (8,  12,  6),
  (9,   4,  5),
  (10, 11,  6),
  (11,  9,  6),
  (12,  6,  4),
  (13, 10,  5),
  (14, 14,  8),
  (15,  6,  4),
  (16,  8,  5),
  (17,  7,  5),
  (18,  9,  5);

-- Robots
INSERT INTO robots (id, status) VALUES
  (1, 'charging'),
  (2, 'charging'),
  (3, 'offline'),
  (4, 'charging'),
  (5, 'charging');

-- Invite codes
INSERT INTO invite_codes (code, role, created_by, used_by, note, created_at, used_at) VALUES
  ('OFS-EMP001', 'employee', 1, NULL, 'Open employee invite', '2026-04-05 09:00:00', NULL),
  ('OFS-MGR001', 'manager',  1, NULL, 'Spare manager invite', '2026-04-05 09:05:00', NULL);

-- Optional saved payment method for the demo customer profile UX
INSERT INTO payment_methods (user_id, cardholder_name, card_last4, card_expiry, card_type, is_default, created_at) VALUES
  (3, 'Test Customer', '4242', '12/28', 'Visa', TRUE, '2026-04-05 10:00:00');
