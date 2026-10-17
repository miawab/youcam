import { allow, ipOf } from "@/lib/limit";
import type { SkinConcern } from "@/lib/types";
import { liveAllowed, runTask, upload } from "@/lib/youcam";

export const maxDuration = 60;

// YouCam skin-simulation parameter for each concern we analyse.
const PARAM: Record<SkinConcern, string> = {
  acne: "acne",
  texture: "texture",
  dark_circle: "dark_circle",
  radiance: "radiance",
};

// Only YouCam's own result storage, so this route can't be used to fetch arbitrary URLs.
const ALLOWED = /^https:\/\/yce-[a-z0-9-]+\.s3[a-z0-9.-]*\.amazonaws\.com\//;

export async function POST(req: Request) {
  const { imageUrl, concerns } = (await req.json()) as { imageUrl: string; concerns: SkinConcern[] };
  if (typeof imageUrl !== "string" || !ALLOWED.test(imageUrl) || !Array.isArray(concerns) || concerns.length === 0)
    return Response.json({ error: "bad request" }, { status: 400 });
  const gate = await liveAllowed();
  if (!gate.live) return Response.json({ error: "sample_only", reason: gate.reason }, { status: 409 });
  if (!allow(ipOf(req), 4)) return Response.json({ error: "sample_only", reason: "Daily demo limit reached" }, { status: 429 });

  // YouCam can't download its own signed result URLs, so re-upload the try-on image.
  const img = new Uint8Array(await (await fetch(imageUrl)).arrayBuffer());
  const fileId = await upload(img, "look.jpg");
  const body: Record<string, unknown> = { src_file_id: fileId };
  for (const c of concerns.slice(0, 4)) if (PARAM[c]) body[PARAM[c]] = 0.65;
  const r = await runTask("v2.0/task/skin-simulation", body);
  if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
  return Response.json({ url: r.results.url });
}
