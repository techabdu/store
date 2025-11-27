CREATE TABLE IF NOT EXISTS shop_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default values if they don't exist
INSERT IGNORE INTO shop_settings (setting_key, setting_value) VALUES 
('shop_name', 'My Phone Store'),
('shop_address', '123 Tech Street, Digital City'),
('shop_phone', ''),
('shop_email', ''),
('business_capital', '0.00'),
('low_stock_threshold', '5');
