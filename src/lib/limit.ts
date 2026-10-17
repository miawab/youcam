import "server-only";

// Best-effort per-IP limit for the public demo (per server instance). The credit floor in
// youcam.ts is the hard stop; this just keeps one visitor from using the whole budget.
const hits = new Map<string, { n: number; day: string }>();

export function allow(ip: string, cost: number, perDay = 40): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip);
  const cur = h && h.day === day ? h.n : 0;
  if (cur + cost > perDay) return false;
  hits.set(ip, { n: cur + cost, day });
  return true;
}

export const ipOf = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
