import { unzipSync, strFromU8 } from "fflate";
import { lengthLevel, textureFromMapping } from "@/lib/route";
import { allow, ipOf } from "@/lib/limit";
import type { Analysis, SkinConcern } from "@/lib/types";
import { liveAllowed, runTask, upload } from "@/lib/youcam";

export const maxDuration = 60;

const SKIN_ACTIONS = ["acne", "texture", "dark_circle_v2", "radiance"];
// Units: type 2 + frizz 2 + length 2 + density 1 + skin 9.
const COST = 16;

async function bytesOf(form: FormData, name: string) {
  const f = form.get(name);
  return f instanceof File && f.size > 0 ? new Uint8Array(await f.arrayBuffer()) : null;
}

async function skinScores(zipUrl: string) {
  const zip = unzipSync(new Uint8Array(await (await fetch(zipUrl)).arrayBuffer()));
  const name = Object.keys(zip).find((n) => n.endsWith("score_info.json"));
  if (!name) throw new Error("no score_info.json");
  const info = JSON.parse(strFromU8(zip[name]));
  const scores: Partial<Record<SkinConcern, number>> = {};
  if (info.acne) scores.acne = info.acne.ui_score;
  if (info.texture) scores.texture = info.texture.ui_score;
  if (info.dark_circle_v2) scores.dark_circle = info.dark_circle_v2.ui_score;
  if (info.radiance) scores.radiance = info.radiance.ui_score;
  return { scores, skinAge: info.skin_age };
}

export async function POST(req: Request) {
  const gate = await liveAllowed();
  if (!gate.live) return Response.json({ error: "sample_only", reason: gate.reason }, { status: 409 });
  if (!allow(ipOf(req), COST)) return Response.json({ error: "sample_only", reason: "Daily demo limit reached" }, { status: 429 });

  const form = await req.formData();
  const [front, right, left, down] = await Promise.all(["front", "right", "left", "down"].map((n) => bytesOf(form, n)));
  if (!front) return Response.json({ error: "front photo required" }, { status: 400 });

  const [fFront, fRight, fLeft, fDown] = await Promise.all([
    upload(front, "front.jpg"),
    right ? upload(right, "right.jpg") : null,
    left ? upload(left, "left.jpg") : null,
    down ? upload(down, "down.jpg") : null,
  ]);
  const angles = fRight && fLeft ? [fFront, fRight, fLeft] : null;

  const [type, frizz, length, density, skin] = await Promise.all([
    angles ? runTask("v2.0/task/hair-type-detection", { src_file_ids: angles }) : null,
    angles ? runTask("v2.0/task/hair-frizziness-detection", { src_file_ids: angles }) : null,
    runTask("v2.0/task/hair-length-detection", { src_file_id: fFront }),
    fDown ? runTask("v2.0/task/hair-density-detection", { src_file_id: fDown }) : null,
    runTask("v2.1/task/skin-analysis", { src_file_id: fFront, dst_actions: SKIN_ACTIONS }),
  ]);

  const out: Analysis = { hair: {}, missing: {}, frontFileId: fFront };
  if (type?.ok) {
    const t = type.results.hair_type as { mapping: string; term: string };
    out.hair.type = { ...t, texture: textureFromMapping(t.mapping) };
  } else out.missing.type = type ? type.error : "needs left and right photos";
  if (frizz?.ok) {
    const f = frizz.results.hair_frizziness as { mapping: number; term: string };
    out.hair.frizz = { level: Number(f.mapping), term: f.term };
  } else out.missing.frizz = frizz ? frizz.error : "needs left and right photos";
  if (length.ok) {
    const l = length.results.hair_length as { term: string };
    out.hair.length = { level: lengthLevel(l.term), term: l.term };
  } else out.missing.length = length.error;
  if (density?.ok) {
    const d = density.results.hair_density as { mapping: string; term: string };
    out.hair.density = { value: Number(d.mapping), term: d.term };
  } else out.missing.density = density ? density.error : "no head-down photo";
  if (skin.ok) {
    try {
      out.skin = await skinScores(skin.results.url as string);
    } catch {
      out.missing.skin = "could not read skin results";
    }
  } else out.missing.skin = skin.error;

  return Response.json(out);
}
