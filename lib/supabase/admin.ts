import { createClient } from "@supabase/supabase-js";

// Service role: HANYA dipakai di server. Melewati RLS.
let _admin: ReturnType<typeof createClient> | null = null;
export function admin() {
  if (!_admin) {
    _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _admin as any; // ganti dengan tipe hasil `npm run db:types` bila sudah ada
}
