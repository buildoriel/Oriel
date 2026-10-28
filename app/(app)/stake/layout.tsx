import { WalletScope } from "@/components/PrivyAuth";

/** This page sends wallet transactions: provide the Privy wallet. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WalletScope>{children}</WalletScope>;
}
