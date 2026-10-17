import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// Limits for the public demo. The credit floor in youcam.ts is the hard stop; these keep any one
// visitor (or a script) from using the budget meant for everyone. Counters live per server
// instance, so they are backed by a signed session token and a signed cookie that work across instances.

export const LIMITS = {
  analysesPerIpPerDay: 2,
  analysesPerHour: 6, // all visitors together, per instance
  tryonsPerSession: 6,
  aftersPerSession: 2,
  sessionMinutes: 90,
};

const counters = new Map<string, { n: number; until: number }>();

// Count one use of `key`, refusing once `max` is reached inside the window.
export function take(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const c = counters.get(key);
  const cur = c && c.until > now ? c : { n: 0, until: now + windowMs };
  if (cur.n >= max) return false;
  cur.n++;
  counters.set(key, cur);
  if (counters.size > 5000) for (const [k, v] of counters) if (v.until < now) counters.delete(k);
  return true;
}

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export const ipOf = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

// Signing key derived from the API key, so there is no extra secret to manage. It never leaves the server.
function secret() {
  return createHash("sha256").update("chairside-session:" + (process.env.YOUCAM_API_KEY ?? "")).digest();
}
const sign = (s: string) => createHmac("sha256", secret()).update(s).digest("base64url");

function seal(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + sign(body);
}
function open<T>(token: unknown): T | null {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

// A session is issued by a paid analysis and is the only way to run try-ons and skin previews.
type Session = { sid: string; fid: string; exp: number };

export function newSession(fileId: string) {
  return seal({ sid: randomUUID(), fid: fileId, exp: Date.now() + LIMITS.sessionMinutes * 60_000 } satisfies Session);
}

export function checkSession(token: unknown): Session | null {
  const s = open<Session>(token);
  return s && s.exp > Date.now() ? s : null;
}

// Per-browser daily count of analyses, in a signed cookie (survives instance changes; clearing
// cookies only gets past this layer, not the IP one).
type Runs = { day: string; n: number };
const today = () => new Date().toISOString().slice(0, 10);

export function runsFromCookie(req: Request): number {
  const raw = req.headers.get("cookie")?.match(/(?:^|;\s*)cs_runs=([^;]+)/)?.[1];
  const r = open<Runs>(raw ? decodeURIComponent(raw) : null);
  return r && r.day === today() ? r.n : 0;
}

export function runsCookie(n: number) {
  return `cs_runs=${encodeURIComponent(seal({ day: today(), n } satisfies Runs))}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`;
}

export const limited = (reason: string) => Response.json({ error: "limited", reason }, { status: 429 });
