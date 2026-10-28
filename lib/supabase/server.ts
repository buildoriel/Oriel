import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
type CookieSet = { name: string; value: string; options?: any }[];

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: CookieSet) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ }
      },
    },
  });
}

export async function requireUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new HttpError(401, "Sign in to continue.");
  return data.user;
}

export class HttpError extends Error {
  /** details: extra JSON returned to the client next to `error` (e.g. scan findings) */
  constructor(public status: number, message: string, public details?: Record<string, unknown>) { super(message); }
}
