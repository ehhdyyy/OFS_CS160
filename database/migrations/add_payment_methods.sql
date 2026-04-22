-- Migration: add normalized saved payment methods for customer profiles
-- Keeps the legacy single-card columns on users for backward compatibility,
-- but moves the app to a proper per-user payment_methods table.

USE ofs_db;

CREATE TABLE IF NOT EXISTS payment_methods (
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

INSERT INTO payment_methods (
    user_id, cardholder_name, card_last4, card_expiry, card_type, is_default
)
SELECT
    id,
    COALESCE(payment_cardholder_name, name),
    payment_card_last4,
    payment_card_expiry,
    payment_card_type,
    TRUE
FROM users
WHERE payment_card_last4 IS NOT NULL
  AND payment_card_last4 <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM payment_methods pm
      WHERE pm.user_id = users.id
  );
