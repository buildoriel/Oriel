"use client";
import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";
import { reportClientError } from "@/components/ErrorReporter";
import { Icon } from "@/components/Icon";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError({ message: error.message || "Render error", stack: error.stack, digest: error.digest }); }, [error]);
  return (
    <StatusPage code={error.digest ? `Error ${error.digest}` : "Error"} title="Something went wrong"
      actions={<>
        <button type="button" className="btn btn-primary" onClick={reset}><Icon name="refresh" />Try again</button>
        <Link href="/" className="btn btn-ghost">Go home</Link>
      </>}>
      We&rsquo;ve logged the problem. Your projects and credits are safe. Try again, or come back in a moment.
    </StatusPage>
  );
}
