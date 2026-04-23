-- Migration: Error Reporting System Overhaul
USE mz_manager;

-- Add archived_at to error_reports
ALTER TABLE error_reports ADD COLUMN archived_at TIMESTAMP NULL;

-- Create error_report_comments table
CREATE TABLE IF NOT EXISTS error_report_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NULL, -- NULL for system messages
    comment TEXT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES error_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
