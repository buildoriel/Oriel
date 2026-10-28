// Minimal in-memory stand-in for the Supabase query builder, enough for agent logic tests.
type Row = Record<string, any>;

export function fakeDb(tables: Record<string, Row[]>, rpcs: Record<string, (args: any) => any> = {}) {
  const t = (name: string) => (tables[name] ??= []);
  function query(name: string) {
    let op: "select" | "update" | "delete" | "insert" | "upsert" = "select";
    let payload: any = null, conflict: string[] = [];
    const filters: ((r: Row) => boolean)[] = [];
    let order: [string, boolean] | null = null, lim = Infinity, one: "single" | "maybe" | null = null;
    const b: any = {
      select: () => b,
      eq: (k: string, v: any) => (filters.push((r) => r[k] === v), b),
      lt: (k: string, v: any) => (filters.push((r) => r[k] < v), b),
      in: (k: string, vs: any[]) => (filters.push((r) => vs.includes(r[k])), b),
      is: (k: string, v: any) => (filters.push((r) => (r[k] ?? null) === v), b),
      order: (k: string, o?: { ascending?: boolean }) => ((order = [k, o?.ascending !== false]), b),
      limit: (n: number) => ((lim = n), b),
      single: () => ((one = "single"), b),
      maybeSingle: () => ((one = "maybe"), b),
      update: (p: Row) => ((op = "update"), (payload = p), b),
      delete: () => ((op = "delete"), b),
      insert: (p: Row | Row[]) => ((op = "insert"), (payload = p), b),
      upsert: (p: Row | Row[], o?: { onConflict?: string }) => ((op = "upsert"), (payload = p), (conflict = (o?.onConflict ?? "id").split(",")), b),
      then: (ok: any, bad: any) => Promise.resolve(run()).then(ok, bad),
    };
    function run() {
      const rows = t(name);
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === "insert") { for (const r of [payload].flat()) rows.push({ id: rows.length + 1, ...r }); return { data: null, error: null }; }
      if (op === "upsert") {
        for (const r of [payload].flat()) {
          const i = rows.findIndex((x) => conflict.every((k) => x[k] === r[k]));
          i >= 0 ? (rows[i] = { ...rows[i], ...r }) : rows.push(r);
        }
        return { data: null, error: null };
      }
      if (op === "update") { rows.filter(match).forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (op === "delete") { tables[name] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
      let out = rows.filter(match).map((r) => ({ ...r }));
      if (order) { const [k, asc] = order; out.sort((a, b) => (a[k] < b[k] ? -1 : 1) * (asc ? 1 : -1)); }
      out = out.slice(0, lim);
      if (one) return { data: out[0] ?? null, error: one === "single" && !out[0] ? { message: "no rows" } : null };
      return { data: out, error: null };
    }
    return b;
  }
  return {
    tables,
    from: (name: string) => query(name),
    rpc: async (name: string, args: any) => {
      try { return { data: rpcs[name](args), error: null }; } catch (e: any) { return { data: null, error: { message: e.message } }; }
    },
  };
}
