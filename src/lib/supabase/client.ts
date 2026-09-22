import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Verifica se as chaves foram fornecidas e não são placeholders
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseKey.includes("your-anon-key")
  );

  return {
    client: isConfigured ? createBrowserClient(supabaseUrl, supabaseKey) : null,
    isConfigured,
  };
}
