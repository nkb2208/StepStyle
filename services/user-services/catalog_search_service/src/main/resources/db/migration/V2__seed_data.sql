-- V2: Seed initial catalog data (Brands, Categories, 9 Products, Diverse Variants & Metrics)

-- 1. Seed Brands
INSERT INTO brands (id, name, logo_url) VALUES
(1, 'Nike', 'https://images.stepstyle.com/brands/nike-swoosh.svg'),
(2, 'Adidas', 'https://images.stepstyle.com/brands/adidas-trefoil.svg'),
(3, 'Puma', 'https://images.stepstyle.com/brands/puma-cat.svg')
ON CONFLICT (id) DO NOTHING;
SELECT setval('brands_id_seq', (SELECT COALESCE(MAX(id), 1) FROM brands));

-- 2. Seed Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Running', 'High-performance running shoes engineered for comfort, cushioning, and responsiveness.'),
(2, 'Sneakers', 'Iconic lifestyle, casual, and street-style sneakers designed for everyday fashion.'),
(3, 'Basketball', 'Court-ready basketball footwear built for explosive traction, lockdown support, and impact absorption.')
ON CONFLICT (id) DO NOTHING;
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));

-- 3. Seed Products (9 distinct shoes across Nike, Adidas, Puma and different categories)
INSERT INTO products (id, name, slug, brand_id, category_id, description, base_price, thumbnail_url, status, created_at, updated_at) VALUES
(1, 'Nike Air Zoom Pegasus 40', 'nike-air-zoom-pegasus-40', 1, 1, 'A springy ride for every run, the Pegasus returns with familiar personalized comfort and enhanced breathability for your daily mileage.', 130.00, 'https://images.stepstyle.com/products/nike-pegasus-40-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(2, 'Nike Air Force 1 07', 'nike-air-force-1-07', 1, 2, 'The radiance lives on in the Nike Air Force 1 07, the b-ball icon that puts a fresh spin on crisp leather, bold colors, and classic comfort.', 115.00, 'https://images.stepstyle.com/products/nike-af1-07-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(3, 'Nike LeBron 21', 'nike-lebron-21', 1, 3, 'Equipped with a cabling system that works with Air Zoom cushioning and a light, court-low design, offering agility and explosiveness.', 200.00, 'https://images.stepstyle.com/products/nike-lebron-21-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(4, 'Adidas Ultraboost Light', 'adidas-ultraboost-light', 2, 1, 'Experience epic energy with the lightest Ultraboost ever made. Features Light BOOST midsole material for unmatched energy return.', 190.00, 'https://images.stepstyle.com/products/adidas-ultraboost-light-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(5, 'Adidas Samba OG', 'adidas-samba-og', 2, 2, 'Born on the pitch, the Samba is a timeless icon of street style with a soft leather upper, suede overlays, and iconic gum rubber sole.', 100.00, 'https://images.stepstyle.com/products/adidas-samba-og-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(6, 'Adidas Harden Vol 7', 'adidas-harden-vol-7', 2, 3, 'James Harden signature shoes blending a futuristic puffer aesthetic with hybrid BOOST and Lightstrike midsole cushioning.', 160.00, 'https://images.stepstyle.com/products/adidas-harden-vol-7-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(7, 'Puma Deviate Nitro 2', 'puma-deviate-nitro-2', 3, 1, 'Max performance running shoe packed with dual-layer NITRO Elite foam and an improved PWRPLATE carbon composite plate.', 160.00, 'https://images.stepstyle.com/products/puma-deviate-nitro-2-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(8, 'Puma Suede Classic XXI', 'puma-suede-classic-xxi', 3, 2, 'The historic silhouette that defined street fashion since 1968, featuring luxurious full suede upper and authentic Puma styling.', 75.00, 'https://images.stepstyle.com/products/puma-suede-classic-xxi-thumb.jpg', 'ACTIVE', NOW(), NOW()),
(9, 'Puma MB.03 LaMelo Ball Chinoiserie', 'puma-mb-03-lamelo-ball', 3, 3, 'LaMelo Balls disruptive third signature shoe featuring claw marks, slime-inspired TPU overlays, and explosive NITRO foam.', 125.00, 'https://images.stepstyle.com/products/puma-mb03-thumb.jpg', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));

-- 4. Seed Product Variants (Different sizes, colors, price overrides, and stock quantities)
INSERT INTO product_variants (product_id, sku, size, color, price_override, stock_quantity, version) VALUES
-- Product 1: Nike Air Zoom Pegasus 40
(1, 'NK-PEG40-WHT-40', '40', 'White', NULL, 45, 0),
(1, 'NK-PEG40-WHT-41', '41', 'White', NULL, 60, 0),
(1, 'NK-PEG40-WHT-42', '42', 'White', NULL, 50, 0),
(1, 'NK-PEG40-BLK-41', '41', 'Black', NULL, 30, 0),
(1, 'NK-PEG40-BLK-42', '42', 'Black', NULL, 0, 0), -- Out of stock for testing

-- Product 2: Nike Air Force 1 07
(2, 'NK-AF1-TRPWHT-40', '40', 'Triple White', NULL, 120, 0),
(2, 'NK-AF1-TRPWHT-41', '41', 'Triple White', NULL, 150, 0),
(2, 'NK-AF1-TRPWHT-42', '42', 'Triple White', NULL, 100, 0),
(2, 'NK-AF1-TRPWHT-43', '43', 'Triple White', NULL, 80, 0),
(2, 'NK-AF1-BLK-42', '42', 'Black', NULL, 40, 0),

-- Product 3: Nike LeBron 21
(3, 'NK-LB21-PUR-42', '42', 'Purple Reign', 210.00, 15, 0),
(3, 'NK-LB21-PUR-43', '43', 'Purple Reign', 210.00, 20, 0),
(3, 'NK-LB21-GLD-44', '44', 'Metallic Gold', 220.00, 8, 0),

-- Product 4: Adidas Ultraboost Light
(4, 'AD-UBL-CBLK-41', '41', 'Core Black', NULL, 35, 0),
(4, 'AD-UBL-CBLK-42', '42', 'Core Black', NULL, 55, 0),
(4, 'AD-UBL-CBLK-43', '43', 'Core Black', NULL, 40, 0),
(4, 'AD-UBL-WHT-42', '42', 'Cloud White', NULL, 25, 0),

-- Product 5: Adidas Samba OG
(5, 'AD-SAM-WHT-39', '39', 'Cloud White', NULL, 90, 0),
(5, 'AD-SAM-WHT-40', '40', 'Cloud White', NULL, 110, 0),
(5, 'AD-SAM-WHT-41', '41', 'Cloud White', NULL, 140, 0),
(5, 'AD-SAM-WHT-42', '42', 'Cloud White', NULL, 85, 0),
(5, 'AD-SAM-BLK-41', '41', 'Core Black', NULL, 65, 0),

-- Product 6: Adidas Harden Vol 7
(6, 'AD-HD7-RED-42', '42', 'Better Scarlet', NULL, 18, 0),
(6, 'AD-HD7-RED-43', '43', 'Better Scarlet', NULL, 14, 0),
(6, 'AD-HD7-SLV-44', '44', 'Silver Metallic', 170.00, 10, 0),

-- Product 7: Puma Deviate Nitro 2
(7, 'PM-DN2-ORG-41', '41', 'Fire Glow', NULL, 22, 0),
(7, 'PM-DN2-ORG-42', '42', 'Fire Glow', NULL, 30, 0),
(7, 'PM-DN2-BLK-42', '42', 'Puma Black', NULL, 15, 0),

-- Product 8: Puma Suede Classic XXI
(8, 'PM-SUE-BLK-40', '40', 'Puma Black', NULL, 70, 0),
(8, 'PM-SUE-BLK-41', '41', 'Puma Black', NULL, 95, 0),
(8, 'PM-SUE-BLK-42', '42', 'Puma Black', NULL, 80, 0),
(8, 'PM-SUE-RED-41', '41', 'High Risk Red', NULL, 45, 0),

-- Product 9: Puma MB.03 LaMelo Ball
(9, 'PM-MB03-GRN-42', '42', 'Toxic Green', 135.00, 25, 0),
(9, 'PM-MB03-GRN-43', '43', 'Toxic Green', 135.00, 30, 0),
(9, 'PM-MB03-BLU-42', '42', 'Blue Hive', 135.00, 12, 0)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- 5. Seed Product Metrics (Diverse stats to thoroughly test and verify ranking algorithm)
-- ranking_score = w1 * ( (review_count * avg_rating + m * C) / (review_count + m) ) + w2 * ln(1 + sold_count) + w3 * ln(1 + review_count)
-- With C=3.5, m=10.0, w1=2.0, w2=1.5, w3=1.0:
-- Product 2 (Air Force 1): 4.8 avg, 15200 reviews, 48000 sold -> massive score (~27.5)
-- Product 5 (Samba OG): 4.7 avg, 8900 reviews, 32000 sold -> very high score (~25.3)
-- Product 1 (Pegasus 40): 4.6 avg, 2400 reviews, 9500 sold -> high score (~21.4)
-- Product 4 (Ultraboost Light): 4.5 avg, 1850 reviews, 6200 sold -> solid score (~20.0)
-- Product 8 (Puma Suede): 4.4 avg, 3200 reviews, 8400 sold -> solid score (~20.6)
-- Product 9 (Puma MB.03): 4.7 avg, 680 reviews, 2100 sold -> medium score (~17.5)
-- Product 3 (LeBron 21): 4.2 avg, 420 reviews, 1100 sold -> medium score (~15.4)
-- Product 7 (Puma Deviate Nitro 2): 4.3 avg, 180 reviews, 550 sold -> lower score (~13.6)
-- Product 6 (Harden Vol 7): 3.9 avg, 95 reviews, 310 sold -> lower score (~11.8)
INSERT INTO product_metrics (product_id, avg_rating, review_count, sold_count, ranking_score) VALUES
(1, 4.6, 2400, 9500, 21.42),
(2, 4.8, 15200, 48000, 27.54),
(3, 4.2, 420, 1100, 15.41),
(4, 4.5, 1850, 6200, 20.05),
(5, 4.7, 8900, 32000, 25.31),
(6, 3.9, 95, 310, 11.82),
(7, 4.3, 180, 550, 13.64),
(8, 4.4, 3200, 8400, 20.63),
(9, 4.7, 680, 2100, 17.52)
ON CONFLICT (product_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    review_count = EXCLUDED.review_count,
    sold_count = EXCLUDED.sold_count,
    ranking_score = EXCLUDED.ranking_score;
