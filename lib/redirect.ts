/** Destination after sign-in: local paths only. Browsers treat "//host" and "/\host" as another domain (open redirect). */
export const safeNext = (raw: string | null | undefined, fallback = "/workspace") =>
  raw && /^\/(?![/\\])/.test(raw) ? raw : fallback;
