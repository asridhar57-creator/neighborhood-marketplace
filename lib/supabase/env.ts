export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isUsingMockCatalog(): boolean {
  return !isSupabaseConfigured();
}

/** Project origin for @supabase/supabase-js. Strips a trailing `/rest/v1/` PostgREST path if present. */
export function supabaseProjectUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.pathname === "/rest/v1" || parsed.pathname === "/rest/v1/") {
      return parsed.origin;
    }
    return raw;
  } catch {
    return raw;
  }
}
