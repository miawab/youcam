import templates from "@/data/templates.json";
import { LIMITS, checkSession, limited, take } from "@/lib/limit";
import { liveAllowed, runTask } from "@/lib/youcam";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { session, templateId } = await req.json();
  if (!templates.some((t) => t.id === templateId)) return Response.json({ error: "bad request" }, { status: 400 });
  // Only the photo from this visitor's own analysis, and only for a limited number of looks.
  const s = checkSession(session);
  if (!s) return limited("Your session ended. Start a new consultation to try more looks.");
  const gate = await liveAllowed();
  if (!gate.live) return Response.json({ error: "sample_only", reason: gate.reason }, { status: 409 });
  if (!take("tryon:" + s.sid, LIMITS.tryonsPerSession, LIMITS.sessionMinutes * 60_000))
    return limited(`That's ${LIMITS.tryonsPerSession} looks on you this session. Every look still shows its full plan.`);

  const r = await runTask("v2.1/task/hair-transfer", { src_file_id: s.fid, template_id: templateId });
  if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
  return Response.json({ url: r.results.url });
}
