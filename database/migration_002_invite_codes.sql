-- Migration 002: Invite codes for employee/manager registration
USE ofs_db;

-- Add is_lead_admin flag to users (only one lead admin exists)
ALTER TABLE users ADD COLUMN is_lead_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Make the existing admin account the lead admin
UPDATE users SET is_lead_admin = TRUE WHERE email = 'admin@ofs.com';

-- Invite codes table
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
