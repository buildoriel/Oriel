import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildoriel.com";
const APP_HOSTS = new Set([ROOT, `www.${ROOT}`, `app.${ROOT}`, "localhost:3000"]);

/**
 * Routing host:
 *  - buildoriel.com / www / app        -> aplikasi Oriel
 *  - <slug>.buildoriel.com              -> /site-host/s/<slug>/<path>   (hasil user)
 *  - preview.buildoriel.com/<projectId>/<token>/<path> -> draf (tanpa cookie, origin terpisah)
 *  - domain lain (custom domain user)   -> /site-host/d/<host>/<path>
 *  - <slug>.localhost:3000 untuk dev
 */
export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const url = req.nextUrl.clone();

  if (!APP_HOSTS.has(host) && !host.endsWith(".vercel.app")) {
    const sub = host.endsWith(`.${ROOT}`) ? host.slice(0, -(ROOT.length + 1))
      : host.endsWith(".localhost:3000") ? host.replace(".localhost:3000", "") : null;
    url.pathname = sub === "preview" ? `/site-host/p${url.pathname}` : sub ? `/site-host/s/${sub}${url.pathname}` : `/site-host/d/${host.split(":")[0]}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (url.pathname.startsWith("/site-host")) return new NextResponse(null, { status: 404 });

  // refresh sesi Supabase untuk aplikasi
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: any }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const protectedPath = /^\/(workspace|stake|connectors|akun)/.test(url.pathname);
  if (protectedPath && !data.user) {
    url.pathname = "/login"; url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  // simpan kode referral 30 hari
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[a-f0-9]{8}$/.test(ref)) res.cookies.set("oriel_ref", ref, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon|icon-|apple-touch).*)"] };
