-- Migration: Add asset flags for lending, reporting and network integration

ALTER TABLE assets 
ADD COLUMN is_reportable BOOLEAN DEFAULT TRUE AFTER notes,
ADD COLUMN is_lendable BOOLEAN DEFAULT TRUE AFTER is_reportable,
ADD COLUMN is_network_integrated BOOLEAN DEFAULT FALSE AFTER is_lendable;

-- Optional: Update existing assets to have sensible defaults
UPDATE assets SET is_reportable = TRUE, is_lendable = TRUE, is_network_integrated = (mac_address IS NOT NULL AND mac_address != '');
