CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    logo_url TEXT
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    brand_id BIGINT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price > 0),
    thumbnail_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','DELETED')),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_base_price ON products(base_price);

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    price_override NUMERIC(12,2) NULL CHECK (price_override IS NULL OR price_override > 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_product_size_color UNIQUE (product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_variants_color ON product_variants(color);
CREATE INDEX IF NOT EXISTS idx_variants_stock_quantity ON product_variants(stock_quantity);

CREATE TABLE IF NOT EXISTS product_metrics (
    product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    review_count BIGINT NOT NULL DEFAULT 0,
    sold_count BIGINT NOT NULL DEFAULT 0,
    ranking_score DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_metrics_ranking_score ON product_metrics(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_sold_count ON product_metrics(sold_count DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_avg_rating ON product_metrics(avg_rating DESC);

CREATE TABLE IF NOT EXISTS stock_transaction_logs (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(150) NOT NULL UNIQUE,
    variant_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('RESERVE','RELEASE','DEDUCT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_variant_id ON stock_transaction_logs(variant_id);
