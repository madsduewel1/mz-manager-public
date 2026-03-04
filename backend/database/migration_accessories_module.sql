-- Migration: Zubehör Modul (Accessories)
-- Adds the accessories table and related settings/permissions

-- 1. Create the accessories table
CREATE TABLE IF NOT EXISTS accessories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    inventory_number VARCHAR(50) UNIQUE NULL,
    serial_number VARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    status ENUM('ok', 'defekt', 'in_reparatur', 'fehlt') NOT NULL DEFAULT 'ok',
    location VARCHAR(200),
    assigned_device_id INT NULL,
    notes TEXT,
    qr_code VARCHAR(100) UNIQUE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_device_id) REFERENCES assets(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add module toggle to settings if not exists
INSERT INTO settings (setting_key, setting_value)
SELECT 'module_accessories_enabled', 'false'
WHERE NOT EXISTS (
    SELECT 1 FROM settings WHERE setting_key = 'module_accessories_enabled'
);

-- 3. Add permission to admin role by default (Role ID 1 is typically Administrator)
INSERT IGNORE INTO role_permissions (role_id, permission)
SELECT id, 'accessories.manage' FROM roles WHERE name = 'Administrator';
