-- Public catalog + guest order RPCs (SECURITY DEFINER, same pattern as search_neighborhood_entities).
-- Lets the PWA read stores/products and place cash/UPI orders despite table RLS.

CREATE OR REPLACE FUNCTION get_store_catalog(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_products JSONB;
BEGIN
  SELECT * INTO v_store FROM stores WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'store_id', p.store_id,
        'title', p.title,
        'short_description', p.short_description,
        'attributes', p.attributes,
        'price', p.price,
        'mrp', p.mrp,
        'images', p.images,
        'is_available', p.is_available,
        'units_sold_count', p.units_sold_count
      )
      ORDER BY p.created_at
    ),
    '[]'::jsonb
  )
  INTO v_products
  FROM products p
  WHERE p.store_id = v_store.id AND p.is_available = true;

  RETURN jsonb_build_object(
    'id', v_store.id,
    'owner_id', v_store.owner_id,
    'name', v_store.name,
    'slug', v_store.slug,
    'business_type', v_store.business_type,
    'category', v_store.category,
    'service_tags', v_store.service_tags,
    'visiting_charge', v_store.visiting_charge,
    'latitude', ST_Y(v_store.location::geometry),
    'longitude', ST_X(v_store.location::geometry),
    'address', v_store.address,
    'landmark', v_store.landmark,
    'whatsapp_number', v_store.whatsapp_number,
    'allows_pickup', v_store.allows_pickup,
    'allows_self_delivery', v_store.allows_self_delivery,
    'delivery_radius_km', v_store.delivery_radius_km,
    'is_taking_orders', v_store.is_taking_orders,
    'completed_orders_count', v_store.completed_orders_count,
    'is_active', v_store.is_active,
    'is_sponsored', v_store.is_sponsored,
    'sponsored_until', v_store.sponsored_until,
    'products', v_products
  );
END;
$$;

CREATE OR REPLACE FUNCTION place_neighborhood_order(
  p_store_id UUID,
  p_fulfillment_type TEXT,
  p_delivery_address TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_customer UUID;
  v_order UUID;
  v_pin VARCHAR(4);
  v_total NUMERIC(10, 2) := 0;
  v_item JSONB;
  v_qty INT;
  v_product products%ROWTYPE;
  v_price NUMERIC(10, 2);
BEGIN
  IF p_fulfillment_type NOT IN ('pickup', 'self_delivery') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid fulfillment.');
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your bag is empty.');
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'That shop is not on this street.');
  END IF;

  IF v_store.business_type <> 'retail' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service profiles do not take a bag.');
  END IF;

  SELECT id INTO v_customer FROM profiles ORDER BY created_at ASC LIMIT 1;
  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No customer profile is set up yet.');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quantity must be at least 1.');
    END IF;

    v_product := NULL;
    IF COALESCE(v_item->>'product_id', '') <> '' THEN
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID
        AND store_id = p_store_id
        AND is_available = true;
    END IF;

    IF v_product.id IS NULL AND COALESCE(v_item->>'title', '') <> '' THEN
      SELECT * INTO v_product
      FROM products
      WHERE store_id = p_store_id
        AND title = v_item->>'title'
        AND is_available = true
      LIMIT 1;
    END IF;

    IF v_product.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'A bag item is not sold by this shop.');
    END IF;

    v_price := v_product.price;
    v_total := v_total + (v_price * v_qty);
  END LOOP;

  v_pin := LPAD((1000 + FLOOR(RANDOM() * 9000)::INT)::TEXT, 4, '0');

  INSERT INTO orders (
    customer_id,
    store_id,
    total_amount,
    fulfillment_type,
    delivery_address,
    verification_pin,
    status
  )
  VALUES (
    v_customer,
    p_store_id,
    v_total,
    p_fulfillment_type,
    p_delivery_address,
    v_pin,
    'placed'
  )
  RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    v_product := NULL;
    IF COALESCE(v_item->>'product_id', '') <> '' THEN
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID AND store_id = p_store_id;
    END IF;
    IF v_product.id IS NULL THEN
      SELECT * INTO v_product
      FROM products
      WHERE store_id = p_store_id AND title = v_item->>'title'
      LIMIT 1;
    END IF;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order, v_product.id, v_qty, v_product.price);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'verification_pin', v_pin
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_order_handover(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_store stores%ROWTYPE;
  v_items JSONB;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = v_order.store_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', oi.product_id,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'title', p.title
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'customer_id', v_order.customer_id,
    'store_id', v_order.store_id,
    'store_name', v_store.name,
    'store_address', v_store.address,
    'latitude', ST_Y(v_store.location::geometry),
    'longitude', ST_X(v_store.location::geometry),
    'total_amount', v_order.total_amount,
    'fulfillment_type', v_order.fulfillment_type,
    'delivery_address', v_order.delivery_address,
    'verification_pin', v_order.verification_pin,
    'failed_pin_attempts', v_order.failed_pin_attempts,
    'locked_until', v_order.locked_until,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'items', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_store_catalog(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION place_neighborhood_order(UUID, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_order_handover(UUID) TO anon, authenticated;
