"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PRIVY_APP_ID, PrivyAuthProvider, PrivyLogout } from "@/components/PrivyAuth";

export default function Logout() {
  return (
    <div className="site-main" style={{ display: "grid", placeItems: "center", minHeight: "calc(100dvh - 64px - 96px)", padding: "48px 16px" }}>
      {PRIVY_APP_ID ? <PrivyAuthProvider><PrivyLogout /></PrivyAuthProvider> : <SupabaseLogout />}
    </div>
  );
}

function SupabaseLogout() {
  useEffect(() => { supabaseBrowser().auth.signOut().finally(() => { location.href = "/"; }); }, []);
  return <p className="small mute center"><span className="spinner" /> Signing out…</p>;
}
