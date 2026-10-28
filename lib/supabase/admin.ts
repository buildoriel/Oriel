import { createClient } from "@supabase/supabase-js";

// Service role: server-side ONLY. Bypasses RLS.
let _admin: ReturnType<typeof createClient> | null = null;
export function admin() {
  if (!_admin) {
    _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _admin as any; // replace with the types from `npm run db:types` once generated
}
