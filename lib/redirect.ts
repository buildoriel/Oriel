/** Tujuan setelah login: hanya path lokal. "//host" dan "/\host" diartikan browser sebagai domain lain (open redirect). */
export const safeNext = (raw: string | null | undefined, fallback = "/workspace") =>
  raw && /^\/(?![/\\])/.test(raw) ? raw : fallback;
