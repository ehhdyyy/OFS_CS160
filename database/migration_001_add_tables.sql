-- OFS Migration: Add missing tables (cart, cart_items, schedules, routes, status_history)
-- Run this after schema.sql: mysql -u root -p < database/migration_001_add_tables.sql

USE ofs_db;

-- ── Shopping Cart ──────────────────────────────────────────────────────────
-- One active cart per user (cleared after checkout)
CREATE TABLE IF NOT EXISTS cart (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cart line items
CREATE TABLE IF NOT EXISTS cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cart_id     INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id)
);

-- ── Delivery Schedules ────────────────────────────────────────────────────
-- A schedule groups multiple deliveries into a time slot for a robot
CREATE TABLE IF NOT EXISTS schedules (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    robot_id          INT NOT NULL,
    scheduled_date    DATE NOT NULL,
    time_window       VARCHAR(50) NOT NULL,
    max_orders        INT NOT NULL DEFAULT 10,
    max_weight_lbs    DECIMAL(6, 2) NOT NULL DEFAULT 200.00,
    current_orders    INT NOT NULL DEFAULT 0,
    current_weight    DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    status            ENUM('open', 'full', 'dispatched', 'completed') DEFAULT 'open',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

-- ── Routes ────────────────────────────────────────────────────────────────
-- Stores computed route info for a delivery trip
CREATE TABLE IF NOT EXISTS routes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id     INT NOT NULL UNIQUE,
    origin_lat      DECIMAL(9, 6) NOT NULL,
    origin_lng      DECIMAL(9, 6) NOT NULL,
    waypoints_json  JSON,
    distance_miles  DECIMAL(6, 2),
    estimated_mins  INT,
    polyline        TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- ── Status History ────────────────────────────────────────────────────────
-- Audit trail for order status transitions
CREATE TABLE IF NOT EXISTS status_history (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    old_status  VARCHAR(50),
    new_status  VARCHAR(50) NOT NULL,
    changed_by  INT,
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note        VARCHAR(255),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);
