import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletScope } from "@/components/PrivyAuth";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Operator tools that send wallet transactions (contract deployment). Only accounts in ADMIN_USER_IDS see them. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const admins = (process.env.ADMIN_USER_IDS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user || !admins.includes(data.user.id)) notFound();
  return <WalletScope>{children}</WalletScope>;
}
