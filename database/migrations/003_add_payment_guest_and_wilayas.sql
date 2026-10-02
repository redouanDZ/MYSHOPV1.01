-- Migration 003: Add Wilayas, Payment and Guest Checkout Fields

CREATE TABLE IF NOT EXISTS wilayas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(10) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    home_delivery_price DECIMAL(10,2) NOT NULL DEFAULT 600.00,
    desk_delivery_price DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    delivery_time_days VARCHAR(50) NOT NULL DEFAULT '2-4 أيام',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wilaya_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alter orders table to support guest checkout, payments and tracking if columns do not exist
ALTER TABLE orders MODIFY COLUMN user_id INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN order_number VARCHAR(50) NULL AFTER id;
ALTER TABLE orders ADD COLUMN tracking_token VARCHAR(100) NULL AFTER order_number;
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'cod' AFTER status;
ALTER TABLE orders ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending' AFTER payment_method;
ALTER TABLE orders ADD COLUMN shipping_full_name VARCHAR(150) NULL AFTER payment_status;
ALTER TABLE orders ADD COLUMN phone VARCHAR(30) NULL AFTER shipping_full_name;
ALTER TABLE orders ADD COLUMN email VARCHAR(100) NULL AFTER phone;
ALTER TABLE orders ADD COLUMN wilaya_id INT UNSIGNED NULL AFTER city;
ALTER TABLE orders ADD COLUMN wilaya_name VARCHAR(100) NULL AFTER wilaya_id;
ALTER TABLE orders ADD COLUMN delivery_type ENUM('home', 'desk') NOT NULL DEFAULT 'home' AFTER wilaya_name;
ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER delivery_type;

-- إدراج الولايات الـ 58 إذا لم تكن موجودة
INSERT IGNORE INTO wilayas (id, code, name_ar, name_fr, home_delivery_price, desk_delivery_price, delivery_time_days) VALUES
(1, '01', 'أدرار', 'Adrar', 1000.00, 700.00, '3-6 أيام'),
(2, '02', 'الشلف', 'Chlef', 600.00, 400.00, '2-3 أيام'),
(3, '03', 'الأغواط', 'Laghouat', 750.00, 500.00, '2-4 أيام'),
(4, '04', 'أم البواقي', 'Oum El Bouaghi', 650.00, 450.00, '2-4 أيام'),
(5, '05', 'باتنة', 'Batna', 650.00, 450.00, '2-3 أيام'),
(6, '06', 'بجاية', 'Béjaïa', 600.00, 400.00, '2-3 أيام'),
(7, '07', 'بسكرة', 'Biskra', 700.00, 500.00, '2-4 أيام'),
(8, '08', 'بشار', 'Béchar', 900.00, 650.00, '3-5 أيام'),
(9, '09', 'البليدة', 'Blida', 500.00, 300.00, '1-2 أيام'),
(10, '10', 'البويرة', 'Bouira', 550.00, 350.00, '1-2 أيام'),
(11, '11', 'تمنراست', 'Tamanrasset', 1300.00, 950.00, '4-7 أيام'),
(12, '12', 'تبسة', 'Tébessa', 700.00, 500.00, '2-4 أيام'),
(13, '13', 'تلمسان', 'Tlemcen', 650.00, 450.00, '2-3 أيام'),
(14, '14', 'تيارت', 'Tiaret', 650.00, 450.00, '2-4 أيام'),
(15, '15', 'تيزي وزو', 'Tizi Ouzou', 550.00, 350.00, '1-2 أيام'),
(16, '16', 'الجزائر العاصمة', 'Alger', 400.00, 250.00, '24-48 ساعة'),
(17, '17', 'الجلفة', 'Djelfa', 700.00, 500.00, '2-4 أيام'),
(18, '18', 'جيجل', 'Jijel', 600.00, 400.00, '2-3 أيام'),
(19, '19', 'سطيف', 'Sétif', 600.00, 400.00, '2-3 أيام'),
(20, '20', 'سعيدة', 'Saïda', 650.00, 450.00, '2-4 أيام'),
(21, '21', 'سكيكدة', 'Skikda', 650.00, 450.00, '2-4 أيام'),
(22, '22', 'سيدي بلعباس', 'Sidi Bel Abbès', 600.00, 400.00, '2-3 أيام'),
(23, '23', 'عنابة', 'Annaba', 650.00, 450.00, '2-3 أيام'),
(24, '24', 'قالمة', 'Guelma', 650.00, 450.00, '2-4 أيام'),
(25, '25', 'قسنطينة', 'Constantine', 600.00, 400.00, '2-3 أيام'),
(26, '26', 'المدية', 'Médéa', 550.00, 350.00, '1-2 أيام'),
(27, '27', 'مستغانم', 'Mostaganem', 600.00, 400.00, '2-3 أيام'),
(28, '28', 'المسيلة', 'M''Sila', 700.00, 500.00, '2-4 أيام'),
(29, '29', 'معسكر', 'Mascara', 600.00, 400.00, '2-3 أيام'),
(30, '30', 'ورقلة', 'Ouargla', 800.00, 600.00, '2-5 أيام'),
(31, '31', 'وهران', 'Oran', 550.00, 350.00, '24-48 ساعة'),
(32, '32', 'البيض', 'El Bayadh', 800.00, 600.00, '3-5 أيام'),
(33, '33', 'إليزي', 'Illizi', 1400.00, 1000.00, '4-7 أيام'),
(34, '34', 'برج بوعريريج', 'Bordj Bou Arreridj', 600.00, 400.00, '2-3 أيام'),
(35, '35', 'بومرداس', 'Boumerdès', 450.00, 250.00, '1-2 أيام'),
(36, '36', 'الطارف', 'El Tarf', 700.00, 500.00, '2-4 أيام'),
(37, '37', 'تندوف', 'Tindouf', 1300.00, 950.00, '4-7 أيام'),
(38, '38', 'تيسمسيلت', 'Tissemsilt', 650.00, 450.00, '2-4 أيام'),
(39, '39', 'الوادي', 'El Oued', 750.00, 550.00, '2-4 أيام'),
(40, '40', 'خنشلة', 'Khenchela', 700.00, 500.00, '2-4 أيام'),
(41, '41', 'سوق أهراس', 'Souk Ahras', 700.00, 500.00, '2-4 أيام'),
(42, '42', 'تيبازة', 'Tipaza', 500.00, 300.00, '1-2 أيام'),
(43, '43', 'ميلة', 'Mila', 650.00, 450.00, '2-3 أيام'),
(44, '44', 'عين الدفلى', 'Aïn Defla', 600.00, 400.00, '2-3 أيام'),
(45, '45', 'النعامة', 'Naâma', 850.00, 650.00, '3-5 أيام'),
(46, '46', 'عين تموشنت', 'Aïn Témouchent', 600.00, 400.00, '2-3 أيام'),
(47, '47', 'غرداية', 'Ghardaïa', 800.00, 600.00, '2-5 أيام'),
(48, '48', 'غليزان', 'Relizane', 600.00, 400.00, '2-3 أيام'),
(49, '49', 'تيميمون', 'Timimoun', 1100.00, 800.00, '3-6 أيام'),
(50, '50', 'برج باجي مختار', 'Bordj Badji Mokhtar', 1500.00, 1100.00, '5-8 أيام'),
(51, '51', 'أولاد جلال', 'Ouled Djellal', 750.00, 550.00, '2-4 أيام'),
(52, '52', 'بني عباس', 'Béni Abbès', 1100.00, 800.00, '3-6 أيام'),
(53, '53', 'إن صالح', 'In Salah', 1200.00, 900.00, '4-7 أيام'),
(54, '54', 'إن قزام', 'In Guezzam', 1500.00, 1100.00, '5-8 أيام'),
(55, '55', 'تقرت', 'Touggourt', 800.00, 600.00, '2-5 أيام'),
(56, '56', 'جانت', 'Djanet', 1400.00, 1000.00, '4-7 أيام'),
(57, '57', 'المغير', 'El M''Ghair', 800.00, 600.00, '2-5 أيام'),
(58, '58', 'المنيعة', 'El Meniaa', 900.00, 650.00, '3-5 أيام');
