-- OFS Database Schema
-- Run this file in MySQL Workbench or via: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS ofs_db;
USE ofs_db;

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('customer', 'employee', 'manager') NOT NULL DEFAULT 'customer',
    address       VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Products ───────────────────────────────────────────────────────────────
CREATE TABLE products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    price       DECIMAL(10, 2) NOT NULL,
    weight_lbs  DECIMAL(6, 2) NOT NULL,
    category    VARCHAR(100),
    is_available  BOOLEAN DEFAULT TRUE,
    image_url   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Inventory ──────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL UNIQUE,
    quantity    INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Robots ─────────────────────────────────────────────────────────────────
CREATE TABLE robots (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100),
    status          ENUM('available', 'on_delivery', 'maintenance') DEFAULT 'available',
    battery_pct     INT DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
    max_weight_lbs  DECIMAL(6, 2) DEFAULT 200.00,
    current_lat     DECIMAL(9, 6),
    current_lng     DECIMAL(9, 6)
);

-- ── Orders ─────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    status          ENUM('processing', 'out_for_delivery', 'delivered') DEFAULT 'processing',
    total_price     DECIMAL(10, 2) NOT NULL,
    total_weight    DECIMAL(6, 2) NOT NULL,
    delivery_fee    DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_date   DATE,
    delivery_window VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Order Items (snapshot of product at time of purchase) ──────────────────
CREATE TABLE order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    name        VARCHAR(150) NOT NULL,   -- snapshot in case product changes later
    price       DECIMAL(10, 2) NOT NULL, -- snapshot
    weight_lbs  DECIMAL(6, 2) NOT NULL,  -- snapshot
    quantity    INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── Deliveries (robot trips) ───────────────────────────────────────────────
CREATE TABLE deliveries (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    robot_id        INT NOT NULL,
    status          ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
    total_weight    DECIMAL(6, 2),
    route_polyline  TEXT,               -- encoded Google Maps polyline
    planned_start   TIMESTAMP,
    completed_at    TIMESTAMP,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

-- ── Delivery <-> Orders join table ────────────────────────────────────────
CREATE TABLE delivery_orders (
    delivery_id INT NOT NULL,
    order_id    INT NOT NULL,
    PRIMARY KEY (delivery_id, order_id),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ── Revenue ────────────────────────────────────────────────────────────────
CREATE TABLE revenue (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL UNIQUE,
    amount      DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ── Seed data: test users ──────────────────────────────────────────────────
-- Passwords are bcrypt hashes — the backend handles hashing, these are just for dev
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Lucas',      'customer@ofs.com', '$2b$12$placeholder_hash_customer', 'customer'),
    ('Admin User', 'admin@ofs.com',    '$2b$12$placeholder_hash_admin',    'manager');

-- ── Seed data: sample products ─────────────────────────────────────────────
INSERT INTO products (name, description, price, weight_lbs, category, is_organic) VALUES
    ('Organic Apples',   'Crisp Fuji apples, locally grown',    4.99,  2.00, 'Fruit',     TRUE),
    ('Organic Bananas',  'Fair-trade organic bananas, 1 bunch', 1.99,  1.00, 'Fruit',     TRUE),
    ('Organic Granola',  'Honey oat granola, 12oz bag',         6.49,  0.75, 'Pantry',    TRUE),
    ('Organic Whole Milk','1 gallon, grass-fed',                7.99, 10.00, 'Dairy',     TRUE),
    ('Organic Spinach',  'Baby spinach, 5oz clamshell',         3.99,  0.31, 'Vegetable', TRUE);

-- Seed inventory for those products
INSERT INTO inventory (product_id, quantity) VALUES (1,50),(2,80),(3,30),(4,20),(5,60);

-- Seed one robot
INSERT INTO robots (name, status, battery_pct) VALUES ('Robot-01', 'available', 100);

