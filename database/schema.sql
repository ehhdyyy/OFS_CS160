-- OFS Database Schema
-- Run this file in MySQL Workbench or via: mysql -u root -p < schema.sql

DROP DATABASE IF EXISTS ofs_db;
CREATE DATABASE IF NOT EXISTS ofs_db;
USE ofs_db;

-- Users
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('customer', 'employee', 'manager') NOT NULL DEFAULT 'customer',
    is_lead_admin BOOLEAN NOT NULL DEFAULT FALSE,
    address       VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    price         DECIMAL(10, 2) NOT NULL,
    weight_lbs    DECIMAL(6, 2) NOT NULL,
    category      VARCHAR(100),
    is_available  BOOLEAN DEFAULT TRUE,
    is_organic    BOOLEAN DEFAULT FALSE,
    image_url     VARCHAR(500),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE inventory (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL UNIQUE,
    quantity    INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Robots
CREATE TABLE robots (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100),
    status          ENUM('available', 'on_delivery', 'maintenance') DEFAULT 'available',
    battery_pct     INT DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
    max_weight_lbs  DECIMAL(6, 2) DEFAULT 200.00,
    current_lat     DECIMAL(9, 6),
    current_lng     DECIMAL(9, 6)
);

-- Orders
CREATE TABLE orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    status           ENUM('processing', 'out_for_delivery', 'delivered') DEFAULT 'processing',
    total_price      DECIMAL(10, 2) NOT NULL,
    total_weight     DECIMAL(6, 2) NOT NULL,
    delivery_fee     DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_date    DATE,
    delivery_window  VARCHAR(50),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order Items
CREATE TABLE order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    name        VARCHAR(150) NOT NULL,
    price       DECIMAL(10, 2) NOT NULL,
    weight_lbs  DECIMAL(6, 2) NOT NULL,
    quantity    INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Deliveries
CREATE TABLE deliveries (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    robot_id        INT NOT NULL,
    status          ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
    total_weight    DECIMAL(6, 2),
    route_polyline  TEXT,
    planned_start   TIMESTAMP,
    completed_at    TIMESTAMP,
    FOREIGN KEY (robot_id) REFERENCES robots(id)
);

-- Delivery <-> Orders join table
CREATE TABLE delivery_orders (
    delivery_id INT NOT NULL,
    order_id    INT NOT NULL,
    PRIMARY KEY (delivery_id, order_id),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Revenue
CREATE TABLE revenue (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL UNIQUE,
    amount      DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Shopping Cart (one active cart per user)
CREATE TABLE cart (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cart Items
CREATE TABLE cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cart_id     INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id)
);

-- Delivery Schedules
CREATE TABLE schedules (
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

-- Routes (computed delivery route info)
CREATE TABLE routes (
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

-- Status History (order status audit trail)
CREATE TABLE status_history (
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

-- Invite Codes
CREATE TABLE invite_codes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    role        ENUM('employee', 'manager') NOT NULL,
    created_by  INT NOT NULL,
    used_by     INT DEFAULT NULL,
    note        VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at     TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (used_by)    REFERENCES users(id)
);

