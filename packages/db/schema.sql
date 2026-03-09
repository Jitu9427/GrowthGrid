-- Initial Database Schema for Mini ERP

-- 1. Shops / Shop Owners
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_name VARCHAR(100) NOT NULL,
    shop_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    language_pref VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(shop_id, name)
);

-- 3. Items / Inventory
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255),
    barcode VARCHAR(100),
    current_stock INT DEFAULT 0,
    min_stock_threshold INT DEFAULT 5,
    purchase_price DECIMAL(12, 2) DEFAULT 0.00,
    selling_price DECIMAL(12, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'pcs', -- pcs, kg, ltr, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transactions (Sales, Purchases, Expenses)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PURCHASE', 'SALE', 'EXPENSE')),
    total_amount DECIMAL(15, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_image_url TEXT, -- For OCR audit
    notes TEXT
);

-- 5. Transaction Line Items
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_per_unit DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL
);

-- 6. Indexes for Performance
CREATE INDEX idx_items_shop_id ON items(shop_id);
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
