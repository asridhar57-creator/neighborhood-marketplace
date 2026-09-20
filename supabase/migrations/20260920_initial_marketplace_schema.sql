-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Profiles (Supabase Auth link)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stores & Providers Table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'retail' CHECK (business_type IN ('retail', 'service')),
  category TEXT NOT NULL,
  service_tags TEXT[] DEFAULT '{}',
  visiting_charge NUMERIC(10, 2) DEFAULT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  address TEXT NOT NULL,
  landmark TEXT,
  whatsapp_number TEXT NOT NULL,
  allows_pickup BOOLEAN DEFAULT true,
  allows_self_delivery BOOLEAN DEFAULT false,
  delivery_radius_km NUMERIC(4, 1) DEFAULT 3.0,
  is_taking_orders BOOLEAN DEFAULT true,
  completed_orders_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_sponsored BOOLEAN DEFAULT false,
  sponsored_until TIMESTAMPTZ DEFAULT NULL,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_location ON stores USING GIST (location);
CREATE INDEX idx_stores_name_trgm ON stores USING GIN (name gin_trgm_ops);
CREATE INDEX idx_stores_category_trgm ON stores USING GIN (category gin_trgm_ops);
CREATE INDEX idx_stores_service_tags_trgm ON stores USING GIN (array_to_string(service_tags, ' ') gin_trgm_ops);

-- 4. Products Table (Max 15 Active Products Trigger)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_description VARCHAR(150),
  attributes JSONB DEFAULT '{}'::jsonb,
  price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2),
  images TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  units_sold_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_title_trgm ON products USING GIN (title gin_trgm_ops);

CREATE OR REPLACE FUNCTION check_store_product_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM products WHERE store_id = NEW.store_id AND is_available = true) >= 15 THEN
    RAISE EXCEPTION 'This store has reached the maximum allowed limit of 15 active products.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_store_product_cap
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION check_store_product_limit();

-- 5. Orders & Offline Handshake Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10, 2) NOT NULL,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('pickup', 'self_delivery')),
  delivery_address TEXT,
  verification_pin VARCHAR(4) NOT NULL,
  failed_pin_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ DEFAULT NULL,
  status TEXT NOT NULL CHECK (status IN ('placed', 'accepted', 'ready', 'completed', 'cancelled')) DEFAULT 'placed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL
);

-- 6. Trigger: Counter Updates on PIN Completion
CREATE OR REPLACE FUNCTION increment_fulfillment_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE stores SET completed_orders_count = completed_orders_count + 1 WHERE id = NEW.store_id;
    UPDATE products p
    SET units_sold_count = p.units_sold_count + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_completed
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION increment_fulfillment_metrics();

-- 7. Atomic PIN Verification with 3-Strike Lockout
CREATE OR REPLACE FUNCTION verify_order_pin_atomic(
  p_order_id UUID,
  p_entered_pin VARCHAR(4)
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, store_id, verification_pin, status, failed_pin_attempts, locked_until
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order does not exist.');
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order has already been completed.');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order has been cancelled.');
  END IF;

  IF v_order.locked_until IS NOT NULL AND v_order.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Verification temporarily locked. Try again after ' || to_char(v_order.locked_until, 'HH12:MI AM')
    );
  END IF;

  IF v_order.verification_pin = p_entered_pin THEN
    UPDATE orders
    SET status = 'completed', failed_pin_attempts = 0, locked_until = NULL
    WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true);
  ELSE
    IF (v_order.failed_pin_attempts + 1) >= 3 THEN
      UPDATE orders
      SET failed_pin_attempts = 0, locked_until = NOW() + INTERVAL '15 minutes'
      WHERE id = p_order_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Too many failed attempts. Verification locked for 15 minutes.'
      );
    ELSE
      UPDATE orders
      SET failed_pin_attempts = failed_pin_attempts + 1
      WHERE id = p_order_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Incorrect PIN. ' || (3 - (v_order.failed_pin_attempts + 1)) || ' attempt(s) remaining.'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Spatial Radius & Typo-Tolerant Search
CREATE OR REPLACE FUNCTION search_neighborhood_entities(
  user_lat FLOAT8,
  user_lng FLOAT8,
  radius_km FLOAT8,
  search_term TEXT DEFAULT '',
  target_type TEXT DEFAULT 'retail'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  business_type TEXT,
  category TEXT,
  address TEXT,
  landmark TEXT,
  whatsapp_number TEXT,
  allows_pickup BOOLEAN,
  allows_self_delivery BOOLEAN,
  is_taking_orders BOOLEAN,
  visiting_charge NUMERIC,
  completed_orders_count INT,
  is_sponsored BOOLEAN,
  distance_meters FLOAT,
  matched_product_title TEXT,
  matched_product_price NUMERIC,
  matched_product_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (s.id)
    s.id,
    s.name,
    s.slug,
    s.business_type,
    s.category,
    s.address,
    s.landmark,
    s.whatsapp_number,
    s.allows_pickup,
    s.allows_self_delivery,
    s.is_taking_orders,
    s.visiting_charge,
    s.completed_orders_count,
    s.is_sponsored,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    p.title AS matched_product_title,
    p.price AS matched_product_price,
    p.images[1] AS matched_product_image
  FROM stores s
  LEFT JOIN products p ON p.store_id = s.id AND p.is_available = true
  WHERE s.is_active = true
    AND s.business_type = target_type
    AND (
      radius_km <= 0
      OR ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
    )
    AND (
      search_term = ''
      OR s.name % search_term
      OR s.category % search_term
      OR array_to_string(s.service_tags, ' ') % search_term
      OR (p.title IS NOT NULL AND p.title % search_term)
    )
  ORDER BY
    s.id,
    (CASE WHEN s.is_sponsored AND (s.sponsored_until IS NULL OR s.sponsored_until > NOW()) THEN 1 ELSE 0 END) DESC,
    distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
