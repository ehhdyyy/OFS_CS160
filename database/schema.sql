-- OFS schema
-- Built for the OFS online organic food store + admin portal.
-- Key modeling choices:
-- - products is the single catalog source of truth for customer and admin
-- - inventory stores current quantity + low stock threshold
-- - orders + order_items are normalized for multi-product purchases
-- - deliveries represents a robot trip/run, and many orders can belong to one delivery
-- - delivery revenue is derived from orders + order_items, not stored in a revenue table
-- - cart, cart_items, and invite_codes are kept compatible with the existing program

DROP DATABASE IF EXISTS ofs_db;
CREATE DATABASE IF NOT EXISTS ofs_db;
USE ofs_db;

CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('customer', 'employee', 'manager') NOT NULL DEFAULT 'customer',
    is_lead_admin BOOLEAN NOT NULL DEFAULT FALSE,
    address       VARCHAR(255),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    price         DECIMAL(10, 2) NOT NULL,
    cost_price    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    weight_lbs    DECIMAL(6, 2) NOT NULL,
    category      VARCHAR(100),
    is_organic    BOOLEAN NOT NULL DEFAULT FALSE,
    image_url     VARCHAR(500),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    product_id          INT NOT NULL UNIQUE,
    quantity            INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    low_stock_threshold INT NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE robots (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    status   ENUM('on_delivery', 'charging', 'offline') NOT NULL DEFAULT 'charging'
);

CREATE TABLE deliveries (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    robot_id      INT NOT NULL,
    status        ENUM('in_transit', 'delivered', 'failed') NOT NULL,
    started_at    TIMESTAMP NULL DEFAULT NULL,
    completed_at  TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

CREATE TABLE orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    delivery_id      INT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_fee     DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    payment_status   ENUM('paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
    paid_at          TIMESTAMP NULL DEFAULT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL
);

CREATE TABLE order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL CHECK (quantity >= 1),
    unit_price  DECIMAL(10, 2) NOT NULL,
    unit_cost   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE cart (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cart_id     INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    added_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id)
);

CREATE TABLE invite_codes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    role        ENUM('employee', 'manager') NOT NULL,
    created_by  INT NOT NULL,
    used_by     INT DEFAULT NULL,
    note        VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at     TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id)
);
