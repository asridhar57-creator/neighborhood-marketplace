CREATE OR REPLACE FUNCTION create_neighborhood_store(
  p_name TEXT,
  p_slug TEXT,
  p_business_type TEXT,
  p_category TEXT,
  p_whatsapp TEXT,
  p_address TEXT,
  p_landmark TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_id UUID;
BEGIN
  v_owner := auth.uid();
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Sign in before listing your shop.';
  END IF;

  IF p_business_type NOT IN ('retail', 'service') THEN
    RAISE EXCEPTION 'Choose retail or service.';
  END IF;

  IF p_lng IS NULL OR p_lat IS NULL THEN
    RAISE EXCEPTION 'Set a map pin for the shop.';
  END IF;

  INSERT INTO stores (
    owner_id,
    name,
    slug,
    business_type,
    category,
    location,
    address,
    landmark,
    whatsapp_number,
    allows_pickup,
    allows_self_delivery
  )
  VALUES (
    v_owner,
    p_name,
    p_slug,
    p_business_type,
    p_category,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_address,
    NULLIF(p_landmark, ''),
    p_whatsapp,
    p_business_type = 'retail',
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_neighborhood_store(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION
) TO authenticated;
