-- Migration: add profile fields to users table
-- Adds structured billing/shipping addresses, payment info, and a
-- location field reserved for future location-based product filtering.

USE ofs_db;

ALTER TABLE users
    -- Billing address
    ADD COLUMN billing_address_line1 VARCHAR(255)  NULL AFTER address,
    ADD COLUMN billing_address_line2 VARCHAR(255)  NULL AFTER billing_address_line1,
    ADD COLUMN billing_city          VARCHAR(100)  NULL AFTER billing_address_line2,
    ADD COLUMN billing_state         VARCHAR(100)  NULL AFTER billing_city,
    ADD COLUMN billing_zip           VARCHAR(20)   NULL AFTER billing_state,
    ADD COLUMN billing_country       VARCHAR(100)  NULL AFTER billing_zip,

    -- Shipping address
    ADD COLUMN shipping_address_line1 VARCHAR(255) NULL AFTER billing_country,
    ADD COLUMN shipping_address_line2 VARCHAR(255) NULL AFTER shipping_address_line1,
    ADD COLUMN shipping_city          VARCHAR(100) NULL AFTER shipping_address_line2,
    ADD COLUMN shipping_state         VARCHAR(100) NULL AFTER shipping_city,
    ADD COLUMN shipping_zip           VARCHAR(20)  NULL AFTER shipping_state,
    ADD COLUMN shipping_country       VARCHAR(100) NULL AFTER shipping_zip,

    -- Payment info (no real processing — stored for UX only)
    ADD COLUMN payment_cardholder_name VARCHAR(255) NULL AFTER shipping_country,
    ADD COLUMN payment_card_last4      CHAR(4)      NULL AFTER payment_cardholder_name,
    ADD COLUMN payment_card_expiry     VARCHAR(7)   NULL AFTER payment_card_last4,
    ADD COLUMN payment_card_type       VARCHAR(30)  NULL AFTER payment_card_expiry,

    -- RESERVED FOR FUTURE USE: location-based product filtering.
    -- Do NOT read or write these columns from the UI yet.
    -- Intended to allow surfacing locally-relevant products to the customer
    -- once the product-catalog feature is built out.
    ADD COLUMN location_city    VARCHAR(100) NULL AFTER payment_card_type,
    ADD COLUMN location_state   VARCHAR(100) NULL AFTER location_city,
    ADD COLUMN location_country VARCHAR(100) NULL AFTER location_state;
