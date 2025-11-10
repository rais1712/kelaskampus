import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {}

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

  const looksLikePlaceholder = (s: string) =>
    !s || 
    s.includes("your-supabase") || 
    s.includes("your-anon-key") || 
    s.includes("__BUILDER_PUBLIC_KEY__");

  if (looksLikePlaceholder(supabaseUrl) || looksLikePlaceholder(supabaseAnonKey)) {
    console.error(
      "❌ Supabase not configured properly!\n" +
      "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n" +
      "See .env.example for reference."
    );
    
    throw new SupabaseConfigError(
      "Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env (do not use the placeholder values)."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Export a default instance for easy imports
export const supabase = getSupabaseClient();
