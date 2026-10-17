import "server-only";

const BASE = "https://yce-api-01.makeupar.com/s2s/";

function key() {
  const k = process.env.YOUCAM_API_KEY;
  if (!k) throw new Error("YOUCAM_API_KEY is not set");
  return k;
}

async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return r.json();
}

export async function credit(): Promise<number> {
  const d = await call("GET", "v1.0/client/credit");
  return (d.results ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
}

export async function upload(bytes: Uint8Array, name = "photo.jpg"): Promise<string> {
  const meta = await call("POST", "v2.0/file", {
    files: [{ content_type: "image/jpeg", file_name: name, file_size: bytes.byteLength }],
  });
  const info = meta.data.files[0];
  const put = info.requests[0];
  const r = await fetch(put.url, { method: "PUT", headers: put.headers ?? { "Content-Type": "image/jpeg" }, body: Buffer.from(bytes) });
  if (!r.ok) throw new Error("upload failed " + r.status);
  return info.file_id;
}

export type TaskResult = { ok: true; results: Record<string, unknown> } | { ok: false; error: string };

export async function runTask(path: string, body: Record<string, unknown>): Promise<TaskResult> {
  const start = await call("POST", path, body);
  const id = start?.data?.task_id;
  if (!id) return { ok: false, error: start?.error_code || start?.error || "task_not_started" };
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const s = await call("GET", `${path}/${id}`);
    const st = s?.data?.task_status;
    if (st === "success") return { ok: true, results: s.data.results };
    if (st === "error") return { ok: false, error: s.data.error || "task_error" };
  }
  return { ok: false, error: "timeout" };
}

// Live calls are allowed only when LIVE_MODE=1 and the balance is above the floor, so a public
// demo can never spend the last units. Below the floor the app falls back to the sample customer.
export async function liveAllowed(): Promise<{ live: boolean; reason?: string }> {
  if (process.env.LIVE_MODE !== "1") return { live: false, reason: "Live mode is off" };
  try {
    const floor = Number(process.env.CREDIT_FLOOR ?? 600);
    const c = await credit();
    return c > floor ? { live: true } : { live: false, reason: "Demo budget used up for now" };
  } catch {
    return { live: false, reason: "YouCam unreachable" };
  }
}
