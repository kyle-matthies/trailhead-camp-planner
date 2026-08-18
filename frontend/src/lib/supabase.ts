import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const configuredUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const configuredKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseConfigured =
  /^https?:\/\//.test(configuredUrl) &&
  !configuredUrl.includes("YOUR_PROJECT_REF") &&
  configuredKey.length > 20 &&
  !configuredKey.includes("YOUR_SUPABASE");

export const isDemoMode =
  (import.meta.env.VITE_DEMO_MODE as string | undefined) !== "false" ||
  !isSupabaseConfigured;

// createClient requires non-empty values even when the network-free demo is
// active. These local-only fallbacks are never contacted in demo mode.
const url = isSupabaseConfigured ? configuredUrl : "http://127.0.0.1:54321";
const publishableKey = isSupabaseConfigured ? configuredKey : "demo-placeholder-key";

/**
 * The single browser Supabase client. RLS is the security boundary, so the
 * frontend talks to Postgres directly for all CRUD. The publishable key is
 * browser-safe; Postgres grants and RLS remain the authorization boundaries.
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Current Supabase access token (JWT), for authenticating calls to the API service. */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
