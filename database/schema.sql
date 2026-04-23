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

    -- Billing address
    billing_address_line1 VARCHAR(255)  NULL,
    billing_address_line2 VARCHAR(255)  NULL,
    billing_city          VARCHAR(100)  NULL,
    billing_state         VARCHAR(100)  NULL,
    billing_zip           VARCHAR(20)   NULL,
    billing_country       VARCHAR(100)  NULL,

    -- Shipping address
    shipping_address_line1 VARCHAR(255) NULL,
    shipping_address_line2 VARCHAR(255) NULL,
    shipping_city          VARCHAR(100) NULL,
    shipping_state         VARCHAR(100) NULL,
    shipping_zip           VARCHAR(20)  NULL,
    shipping_country       VARCHAR(100) NULL,

    -- Payment info (no real processing — stored for UX only)
    payment_cardholder_name VARCHAR(255) NULL,
    payment_card_last4      CHAR(4)      NULL,
    payment_card_expiry     VARCHAR(7)   NULL,
    payment_card_type       VARCHAR(30)  NULL,

    -- RESERVED FOR FUTURE USE: location-based product filtering.
    -- Do NOT read or write these columns from the UI yet.
    -- Intended to allow surfacing locally-relevant products to the customer
    -- once the product-catalog feature is built out.
    location_city    VARCHAR(100) NULL,
    location_state   VARCHAR(100) NULL,
    location_country VARCHAR(100) NULL,

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
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    status              ENUM('on_delivery', 'charging', 'offline') NOT NULL DEFAULT 'charging',
    battery_pct         INT NOT NULL DEFAULT 100,
    charging_started_at TIMESTAMP NULL DEFAULT NULL
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
    delivery_latitude  DECIMAL(10, 7) NULL,
    delivery_longitude DECIMAL(10, 7) NULL,
    delivery_fee     DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    total_price      DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_weight     DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
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

CREATE TABLE password_reset_tokens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token       VARCHAR(100) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE payment_methods (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    cardholder_name VARCHAR(255) NOT NULL,
    card_last4      CHAR(4) NOT NULL,
    card_expiry     VARCHAR(7) NULL,
    card_type       VARCHAR(30) NULL,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
