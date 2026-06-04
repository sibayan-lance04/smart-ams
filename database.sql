-- =====================================================
-- Smart Asset Management System
-- Database: asset_management
-- Compatible with: XAMPP MySQL 8.0+
-- Default Login: admin / admin123
-- =====================================================

CREATE DATABASE IF NOT EXISTS asset_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asset_management;

-- Users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin') NOT NULL DEFAULT 'Admin',
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_department (department_id)
);

-- Departments table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(255) NOT NULL,
    description TEXT,
    manager VARCHAR(255),
    manager_email VARCHAR(255),
    manager_contact VARCHAR(50),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_department_name (department_name),
    INDEX idx_status (status)
);

-- Assets table
CREATE TABLE assets (
    asset_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    description TEXT,
    control_number VARCHAR(100) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL,
    cost DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2),
    lifetime_years INT NOT NULL,
    depreciation_method ENUM('straight-line', 'declining-balance') DEFAULT 'straight-line',
    status ENUM('Active', 'Depreciated', 'Disposed', 'Under Maintenance') DEFAULT 'Active',
    assigned_to_name VARCHAR(255),
    assigned_to_email VARCHAR(255),
    assigned_to_contact VARCHAR(50),
    department_id INT,
    asset_location VARCHAR(255),
    insurance_type VARCHAR(255),
    insurance_provider VARCHAR(255),
    insurance_start DATE,
    insurance_end DATE,
    insurance_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_control_number (control_number),
    INDEX idx_status (status),
    INDEX idx_department (department_id),
    INDEX idx_purchase_date (purchase_date),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- Maintenance table
CREATE TABLE maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    maintenance_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    details TEXT NOT NULL,
    status ENUM('Pending', 'Completed') DEFAULT 'Pending',
    cost DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_asset (asset_id),
    INDEX idx_next_due (next_due_date),
    INDEX idx_status (status),
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- Activity Log table (user_id=0 means system entry)
CREATE TABLE activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL DEFAULT 0,
    action_type ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'MONITOR') NOT NULL,
    table_name VARCHAR(100),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action_type)
);

-- Add FK for activity_log (allows user_id=0 for system entries)
ALTER TABLE activity_log
  ADD CONSTRAINT fk_activity_user
  FOREIGN KEY (user_id) REFERENCES users(user_id)
  ON DELETE CASCADE;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default admin user (password: admin123)
-- Hash generated with bcrypt (rounds=10), compatible with bcryptjs
INSERT INTO users (full_name, username, password, role) VALUES
('System Administrator', 'admin', '$2a$10$oeob/pbnxaA0eMZeECShkO/3EfdeyiEh2vHR5KSxt9kM.HqpiktWC', 'Admin');

-- Sample departments
INSERT INTO departments (department_name, description, manager, manager_email, manager_contact, status) VALUES
('Information Technology', 'IT Department responsible for technology infrastructure', 'John Smith', 'john.smith@company.com', '09123456789', 'Active'),
('Finance', 'Finance Department for financial operations', 'Mike Johnson', 'mike.johnson@company.com', '09123456791', 'Active'),
('Human Resources', 'HR Department for employee management', 'Jane Doe', 'jane.doe@company.com', '09123456790', 'Active'),
('Marketing', 'Marketing Department for promotional activities', 'David Brown', 'david.brown@company.com', '09123456793', 'Active'),
('Operations', 'Operations Department for daily operations', 'Sarah Wilson', 'sarah.wilson@company.com', '09123456792', 'Active');

-- Sample assets
INSERT INTO assets (asset_name, description, control_number, purchase_date, cost, current_value, lifetime_years, depreciation_method, status, assigned_to_name, assigned_to_email, assigned_to_contact, department_id, asset_location, insurance_type, insurance_provider, insurance_start, insurance_end, insurance_details) VALUES
('Dell Laptop XPS 13', '13-inch ultrabook, Intel Core i7, 16GB RAM, 512GB SSD', 'IT-001-2024', '2024-01-15', 75000.00, 72500.00, 5, 'straight-line', 'Active', 'John Smith', 'john.smith@company.com', '09123456789', 1, 'IT Office Room 201', 'Equipment Insurance', 'Philippine Insurance Corp', '2024-01-15', '2026-01-15', 'Covers accidental damage and theft. Policy #EQ-2024-001.'),
('HP Desktop Computer', 'HP EliteDesk, Intel Core i5, 8GB RAM, 256GB SSD', 'IT-002-2024', '2024-02-20', 45000.00, 43500.00, 4, 'straight-line', 'Active', 'Jane Doe', 'jane.doe@company.com', '09123456790', 3, 'HR Office Room 101', 'Equipment Insurance', 'Metro Insurance', '2024-02-20', '2026-02-20', 'Standard equipment coverage. Policy #EQ-2024-002.'),
('Canon Laser Printer', 'Canon imageRUNNER 2630i, A3 capable, network printer', 'IT-003-2024', '2024-03-10', 25000.00, 24000.00, 3, 'straight-line', 'Active', 'Mike Johnson', 'mike.johnson@company.com', '09123456791', 2, 'Finance Office Room 301', 'Equipment Insurance', 'Philippine Insurance Corp', '2024-03-10', '2025-03-10', 'Equipment coverage. Policy #EQ-2024-003.'),
('Office Desk Set', 'L-shaped executive desk with matching chair, dark wood finish', 'ADM-001-2024', '2024-01-05', 15000.00, 14500.00, 10, 'straight-line', 'Active', 'Sarah Wilson', 'sarah.wilson@company.com', '09123456792', 5, 'Operations Office Room 401', 'Property Insurance', 'Property Insurance Inc', '2024-01-05', '2025-01-05', 'Furniture coverage. Policy #PR-2024-001.'),
('Conference Table', '12-seater mahogany conference table', 'ADM-002-2024', '2024-02-15', 35000.00, 34500.00, 15, 'straight-line', 'Active', 'David Brown', 'david.brown@company.com', '09123456793', 4, 'Marketing Conference Room B', 'Property Insurance', 'Property Insurance Inc', '2024-02-15', '2025-02-15', 'Furniture and fixtures. Policy #PR-2024-002.'),
('Cisco Network Switch', '48-port gigabit managed switch', 'IT-004-2024', '2023-06-01', 55000.00, 12000.00, 5, 'straight-line', 'Depreciated', NULL, NULL, NULL, 1, 'Server Room B1', NULL, NULL, NULL, NULL, NULL),
('Old UPS Battery Unit', 'APC 1500VA UPS — end of life', 'IT-005-2020', '2020-01-10', 18000.00, 0.00, 5, 'straight-line', 'Disposed', NULL, NULL, NULL, 1, 'Storage Room', NULL, NULL, NULL, NULL, NULL);

-- Sample maintenance records
INSERT INTO maintenance (asset_id, maintenance_date, next_due_date, details, status, cost) VALUES
(1, '2024-01-15', '2024-07-15', 'Initial setup and software installation', 'Completed', 2000.00),
(2, '2024-02-20', '2024-08-20', 'System configuration and security hardening', 'Completed', 1500.00),
(3, '2024-03-10', '2024-09-10', 'Printer setup, calibration, and test prints', 'Completed', 800.00),
(1, '2024-07-15', CURDATE() + INTERVAL 7 DAY, 'Regular cleaning, OS updates, antivirus scan', 'Pending', 0.00),
(2, '2024-08-20', CURDATE() + INTERVAL 15 DAY, 'Hardware diagnostics and software updates', 'Pending', 0.00),
(3, '2024-09-10', CURDATE() + INTERVAL 3 DAY, 'Toner replacement and roller cleaning', 'Pending', 0.00);

-- =====================================================
-- VIEWS (same as original)
-- =====================================================

CREATE OR REPLACE VIEW asset_summary AS
SELECT
    a.asset_id, a.asset_name, a.control_number, a.purchase_date,
    a.cost, a.current_value, a.status, a.assigned_to_name,
    d.department_name,
    CASE WHEN a.insurance_end >= CURDATE() THEN 'Under Warranty' ELSE 'Warranty Expired' END AS warranty_status,
    ROUND(((a.cost - COALESCE(a.current_value,0)) / a.cost) * 100, 2) AS depreciation_percentage
FROM assets a
LEFT JOIN departments d ON a.department_id = d.department_id;

CREATE OR REPLACE VIEW maintenance_due_view AS
SELECT
    m.maintenance_id, a.asset_name, a.control_number,
    m.next_due_date, m.details, m.status,
    DATEDIFF(m.next_due_date, CURDATE()) AS days_until_due
FROM maintenance m
JOIN assets a ON m.asset_id = a.asset_id
WHERE m.status = 'Pending'
  AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY m.next_due_date ASC;
