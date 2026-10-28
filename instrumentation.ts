// Next.js server instrumentation: store uncaught server errors (render, route handlers, server actions) in app_errors.
// Route handlers wrapped in handle() catch their own errors and report them from lib/http.ts.
export async function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string; headers: Record<string, string | string[] | undefined> }, context: { routePath?: string; routeType?: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;  // the admin client is not used on the edge (middleware)
  try {
    const { reportError } = await import("./lib/monitoring");
    const e = err as Error & { digest?: string };
    const ua = request.headers["user-agent"];
    await reportError({
      source: "server", message: `${e?.message ?? String(err)} (${request.method} ${context.routePath ?? request.path})`,
      stack: e?.stack, url: request.path, digest: e?.digest, userAgent: Array.isArray(ua) ? ua[0] : ua,
    });
  } catch { /* never throw from instrumentation */ }
}
