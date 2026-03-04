-- Migration: Add Network Module tables and fields

-- VLANs Table
CREATE TABLE IF NOT EXISTS network_vlans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vlan_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    subnet VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend Assets Table with Network Fields
ALTER TABLE assets 
ADD COLUMN network_vlan_id INT NULL AFTER container_id,
ADD COLUMN ip_address VARCHAR(45) NULL AFTER network_vlan_id,
ADD COLUMN mac_address VARCHAR(17) NULL AFTER ip_address,
ADD COLUMN dhcp_enabled BOOLEAN DEFAULT FALSE AFTER mac_address,
ADD COLUMN switch_name VARCHAR(100) NULL AFTER dhcp_enabled,
ADD COLUMN port_number VARCHAR(50) NULL AFTER switch_name,
ADD COLUMN network_role ENUM('Client', 'Server', 'Printer', 'AP', 'Switch', 'Router', 'Sonstiges') DEFAULT 'Client' AFTER port_number;

-- Add Foreign Key for VLAN
ALTER TABLE assets
ADD CONSTRAINT fk_asset_vlan
FOREIGN KEY (network_vlan_id) REFERENCES network_vlans(id) ON DELETE SET NULL;

-- Add setting for module toggle
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('module_network_enabled', 'false');
