-- MZ-Manager Database Schema
-- MySQL Database for Media Center Management System

CREATE DATABASE IF NOT EXISTS mz_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mz_manager;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    requires_password_change BOOLEAN DEFAULT FALSE,
    has_seen_onboarding BOOLEAN DEFAULT FALSE,
    theme ENUM('light', 'dark') DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY idx_role_perm (role_id, permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles Join Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Direct Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY idx_user_perm (user_id, permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Containers Table (iPad-Wagen, Laptopwagen, Räume, etc.)
CREATE TABLE IF NOT EXISTS containers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('wagen', 'raum', 'koffer', 'fach', 'sonstiges') NOT NULL,
    description TEXT,
    location VARCHAR(200),
    building VARCHAR(100),
    floor VARCHAR(50),
    parent_container_id INT NULL,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    capacity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_container_id) REFERENCES containers(id) ON DELETE SET NULL,
    INDEX idx_qr_code (qr_code),
    INDEX idx_parent (parent_container_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assets Table (Laptops, iPads, Beamer, etc.)
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_number VARCHAR(50) UNIQUE NOT NULL,
    serial_number VARCHAR(100),
    type ENUM('laptop', 'ipad', 'tablet', 'beamer', 'monitor', 'ladegeraet', 'adapter', 'maus', 'tastatur', 'sonstiges') NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    status ENUM('ok', 'defekt', 'in_reparatur', 'ausgemustert') NOT NULL DEFAULT 'ok',
    container_id INT NULL,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE,
    warranty_until DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL,
    INDEX idx_inventory (inventory_number),
    INDEX idx_qr_code (qr_code),
    INDEX idx_status (status),
    INDEX idx_container (container_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lendings Table (Ausleihen)
CREATE TABLE IF NOT EXISTS lendings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NULL,
    container_id INT NULL,
    user_id INT NOT NULL,
    borrower_name VARCHAR(100),
    borrower_type ENUM('Lehrer', 'klasse', 'projektgruppe', 'sonstiges') NOT NULL,
    start_date DATETIME NOT NULL,
    planned_end_date DATETIME NOT NULL,
    actual_end_date DATETIME NULL,
    returned BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_returned (returned),
    INDEX idx_dates (start_date, planned_end_date),
    CHECK (asset_id IS NOT NULL OR container_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Error Reports Table (Fehlermeldungen)
CREATE TABLE IF NOT EXISTS error_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NULL,
    container_id INT NULL,
    description TEXT NOT NULL,
    photo_path VARCHAR(255),
    reporter_name VARCHAR(100),
    reporter_email VARCHAR(100),
    status ENUM('offen', 'in_bearbeitung', 'erledigt', 'abgelehnt') NOT NULL DEFAULT 'offen',
    priority ENUM('niedrig', 'mittel', 'hoch') DEFAULT 'mittel',
    created_by INT NULL,
    assigned_to INT NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    CHECK (asset_id IS NOT NULL OR container_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Device Models Table
CREATE TABLE IF NOT EXISTS device_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asset History Table (Historie aller Änderungen)
CREATE TABLE IF NOT EXISTS asset_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    action ENUM('created', 'updated', 'status_changed', 'moved', 'lent', 'returned') NOT NULL,
    details TEXT,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_asset (asset_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings Table (for organization name, etc.)
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('org_name', 'MZ-MANAGER');

-- Insert Default Roles
INSERT IGNORE INTO roles (name, description, is_system) VALUES 
('Administrator', 'Vollzugriff auf alle Funktionen', TRUE),
('Benutzer', 'Standardbenutzer ohne Berechtigungen', TRUE);

-- Insert Default Permissions for Administrator
SET @admin_role_id = (SELECT id FROM roles WHERE name = 'Administrator');
INSERT IGNORE INTO role_permissions (role_id, permission) VALUES 
(@admin_role_id, 'all');

-- Insert Default Admin User
-- Password: admin123 (BITTE ÄNDERN!)
INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name, is_active) 
VALUES ('admin', 'admin@medienzentrum.local', '$2b$10$x9GoHliN8iiVaP4bmX2G1.XZB.YUlYOR5mdkr0/OHvRdZr48jZGJG', 'Admin', 'User', TRUE);

-- Link Admin User to Administrator Role
SET @admin_user_id = (SELECT id FROM users WHERE username = 'admin');
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (@admin_user_id, @admin_role_id);
