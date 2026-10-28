import { AppShell } from "@/components/AppShell";

/** Product pages: sidebar shell (projects, navigation, credits, account). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
