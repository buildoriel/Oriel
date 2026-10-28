import type { Metadata } from "next";
import { WalletScope } from "@/components/PrivyAuth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Operator tools that send wallet transactions (contract deployment). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WalletScope>{children}</WalletScope>;
}
