-- OFS seed data
-- Exactly one operating week: Monday 2026-03-30 through Sunday 2026-04-05.
-- Run schema first, then this file.

USE ofs_db;

SET @demo_hash = '$2b$12$/Sna3KjXzGLdAAzYGqV9UOo4Pi2i8rHhB7B3H9uKmvXO4KVMoBE.W';

-- Users
INSERT INTO users (id, name, email, password_hash, role, is_lead_admin, address, created_at) VALUES
  (1,  'Admin',          'admin@ofs.com',        @demo_hash, 'manager',  TRUE,  '97 S Second St, San Jose, CA 95113',          '2026-03-30 08:00:00'),
  (2,  'Test Employee',  'employee@ofs.com',     @demo_hash, 'employee', FALSE, '1 Washington Sq, San Jose, CA 95192',         '2026-03-30 08:05:00'),
  (3,  'Test Customer',  'customer@ofs.com',     @demo_hash, 'customer', FALSE, '95 Paseo de San Antonio, San Jose, CA 95113', '2026-03-30 08:10:00'),
  (4,  'Maria Santos',   'maria@sjsu.edu',       @demo_hash, 'customer', FALSE, '123 E San Fernando St, San Jose, CA 95112',   '2026-03-30 08:15:00'),
  (5,  'Kevin Nguyen',   'kevin@sjsu.edu',       @demo_hash, 'customer', FALSE, '456 S 4th St, San Jose, CA 95112',            '2026-03-30 08:20:00'),
  (6,  'Emily Chen',     'emily@gmail.com',      @demo_hash, 'customer', FALSE, '789 W San Carlos St, San Jose, CA 95126',     '2026-03-30 08:25:00'),
  (7,  'Daniel Kim',     'daniel@ofs-demo.com',  @demo_hash, 'customer', FALSE, '1180 Lincoln Ave, San Jose, CA 95125',        '2026-03-30 08:30:00'),
  (8,  'Priya Patel',    'priya@ofs-demo.com',   @demo_hash, 'customer', FALSE, '777 Story Rd, San Jose, CA 95122',            '2026-03-30 08:35:00'),
  (9,  'Jasmine Lee',    'jasmine@ofs-demo.com', @demo_hash, 'customer', FALSE, '1095 The Alameda, San Jose, CA 95126',        '2026-03-30 08:40:00'),
  (10, 'Marcus Hill',    'marcus@ofs-demo.com',  @demo_hash, 'customer', FALSE, '480 E McLaughlin Ave, San Jose, CA 95112',    '2026-03-30 08:45:00'),
  (11, 'Laura Garcia',   'laura@ofs-demo.com',   @demo_hash, 'customer', FALSE, '321 S 1st St, San Jose, CA 95113',            '2026-03-30 08:50:00');

-- Products
-- image_url left NULL on purpose: your customer pages already generate working fallback images by category.
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

-- Robots (exactly 5 total)
INSERT INTO robots (id, status, battery_pct, charging_started_at) VALUES
  (1, 'charging',    100, NULL),
  (2, 'charging',    100, NULL),
  (3, 'offline',      40, NULL),
  (4, 'charging',    100, NULL),
  (5, 'on_delivery',  62, NULL);

-- Deliveries (all within the single Monday-Sunday week)
INSERT INTO deliveries (id, robot_id, status, started_at, completed_at) VALUES
  (1, 1, 'delivered',  '2026-03-30 10:05:00', '2026-03-30 10:42:00'),
  (2, 2, 'delivered',  '2026-03-31 11:05:00', '2026-03-31 11:43:00'),
  (3, 3, 'failed',     '2026-04-01 12:10:00', '2026-04-01 12:51:00'),
  (4, 4, 'delivered',  '2026-04-02 13:20:00', '2026-04-02 13:54:00'),
  (5, 5, 'delivered',  '2026-04-03 14:10:00', '2026-04-03 14:41:00'),
  (6, 1, 'delivered',  '2026-04-04 15:05:00', '2026-04-04 15:47:00'),
  (7, 5, 'in_transit', '2026-04-05 09:15:00', NULL),
  (8, 2, 'delivered',  '2026-04-05 11:35:00', '2026-04-05 12:08:00'),
  (9, 4, 'delivered',  '2026-04-05 13:05:00', '2026-04-05 13:39:00');

-- Orders
INSERT INTO orders (id, user_id, delivery_id, delivery_address, delivery_fee, payment_status, paid_at, created_at) VALUES
  (1,  4, 1, '123 E San Fernando St, San Jose, CA 95112',    0.00, 'paid', '2026-03-30 10:00:00', '2026-03-30 10:00:00'),
  (2,  5, 2, '456 S 4th St, San Jose, CA 95112',             0.00, 'paid', '2026-03-31 11:00:00', '2026-03-31 11:00:00'),
  (3,  6, 3, '789 W San Carlos St, San Jose, CA 95126',     10.00, 'paid', '2026-04-01 12:00:00', '2026-04-01 12:00:00'),
  (4,  7, 4, '1180 Lincoln Ave, San Jose, CA 95125',         0.00, 'paid', '2026-04-02 13:10:00', '2026-04-02 13:10:00'),
  (5,  8, 5, '777 Story Rd, San Jose, CA 95122',             0.00, 'paid', '2026-04-03 14:00:00', '2026-04-03 14:00:00'),
  (6,  9, 6, '1095 The Alameda, San Jose, CA 95126',        10.00, 'paid', '2026-04-04 14:55:00', '2026-04-04 14:55:00'),
  (7, 10, 7, '480 E McLaughlin Ave, San Jose, CA 95112',     0.00, 'paid', '2026-04-05 09:05:00', '2026-04-05 09:05:00'),
  (8, 11, 8, '321 S 1st St, San Jose, CA 95113',             0.00, 'paid', '2026-04-05 11:30:00', '2026-04-05 11:30:00'),
  (9,  3, 9, '95 Paseo de San Antonio, San Jose, CA 95113',  0.00, 'paid', '2026-04-05 13:00:00', '2026-04-05 13:00:00');

-- Order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, unit_cost) VALUES
  -- Order 1 weight 4.00 => free
  (1, 2,  2,  1.99, 1.10),
  (1, 10, 1,  5.99, 3.75),

  -- Order 2 weight 11.50 => free
  (2, 9,  1,  7.99, 5.10),
  (2, 13, 1,  5.99, 3.25),

  -- Order 3 weight 23.10 => 10.00 delivery fee
  (3, 12, 2, 10.99, 7.20),
  (3, 15, 1,  8.99, 5.90),
  (3, 9,  2,  7.99, 5.10),

  -- Order 4 weight 4.50 => free
  (4, 14, 1,  2.99, 1.45),
  (4, 16, 1,  6.99, 4.15),

  -- Order 5 weight 2.50 => free
  (5, 3,  1,  5.49, 3.50),
  (5, 13, 1,  5.99, 3.25),

  -- Order 6 weight 21.50 => 10.00 delivery fee
  (6, 9,  2,  7.99, 5.10),
  (6, 11, 1,  6.49, 4.10),

  -- Order 7 weight 2.50 => free
  (7, 12, 1, 10.99, 7.20),
  (7, 4,  1,  6.99, 4.20),

  -- Order 8 weight 5.50 => free
  (8, 1,  1,  4.99, 3.10),
  (8, 16, 1,  6.99, 4.15),

  -- Order 9 weight 15.50 => free
  (9, 9,  1,  7.99, 5.10),
  (9, 10, 2,  5.99, 3.75),
  (9, 11, 1,  6.49, 4.10);

-- Cart
INSERT INTO cart (id, user_id, created_at, updated_at) VALUES
  (1, 3, '2026-04-05 13:50:00', '2026-04-05 13:55:00');

INSERT INTO cart_items (cart_id, product_id, quantity, added_at) VALUES
  (1, 3,  1, '2026-04-05 13:51:00'),
  (1, 14, 2, '2026-04-05 13:53:00');

-- Invite codes
INSERT INTO invite_codes (code, role, created_by, used_by, note, created_at, used_at) VALUES
  ('OFS-EMP001', 'employee', 1, NULL, 'Open employee invite', '2026-04-05 09:00:00', NULL),
  ('OFS-MGR001', 'manager',  1, NULL, 'Spare manager invite', '2026-04-05 09:05:00', NULL);
