import templates from "@/data/templates.json";
import { allow, ipOf } from "@/lib/limit";
import { liveAllowed, runTask } from "@/lib/youcam";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { fileId, templateId } = await req.json();
  if (typeof fileId !== "string" || !templates.some((t) => t.id === templateId))
    return Response.json({ error: "bad request" }, { status: 400 });
  const gate = await liveAllowed();
  if (!gate.live) return Response.json({ error: "sample_only", reason: gate.reason }, { status: 409 });
  if (!allow(ipOf(req), 2)) return Response.json({ error: "sample_only", reason: "Daily demo limit reached" }, { status: 429 });

  const r = await runTask("v2.1/task/hair-transfer", { src_file_id: fileId, template_id: templateId });
  if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
  return Response.json({ url: r.results.url });
}
