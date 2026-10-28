import Link from "next/link";
import { StatusPage } from "@/components/StatusPage";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage code="404" title="This page doesn't exist"
      actions={<>
        <Link href="/" className="btn btn-primary">Go home</Link>
        <Link href="/workspace" className="btn btn-ghost">Open workspace<Icon name="arrowRight" /></Link>
      </>}>
      The link may be broken, or the page may have moved. If you were looking for a project, it may have been deleted.
    </StatusPage>
  );
}
