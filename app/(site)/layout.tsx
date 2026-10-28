import { SiteNav } from "@/components/SiteNav";
import { Footer } from "@/components/Footer";

/** Public pages: top navigation + footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
