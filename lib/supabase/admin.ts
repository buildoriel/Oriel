import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Service role: server-side ONLY. Bypasses RLS.
let _admin: SupabaseClient<Database> | null = null;
export function admin() {
  _admin ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return _admin;
}

/** Tests only: swap in an in-memory client (scripts/agent-queue.test.ts). */
export function setAdminForTests(client: unknown) {
  _admin = client as SupabaseClient<Database>;
}
