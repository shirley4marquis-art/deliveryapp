import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: SupabaseClient<Database> | null = null;
let publicClient: SupabaseClient<Database> | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      requireEnv("VITE_SUPABASE_URL"),
      requireEnv("VITE_SUPABASE_ANON_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}

export function getSupabasePublic() {
  if (!publicClient) {
    publicClient = createClient<Database>(
      requireEnv("VITE_SUPABASE_URL"),
      requireEnv("VITE_SUPABASE_ANON_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return publicClient;
}

export function getSupabaseForUser(accessToken: string) {
  return createClient<Database>(
    requireEnv("VITE_SUPABASE_URL"),
    requireEnv("VITE_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}
