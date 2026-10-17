import { effortLabel, planFor } from "./route";
import type { Analysis, Plan, Template } from "./types";

// Common stylist guidance per face shape (YouCam's face shape classes). A salon rule, not a measurement.
type Fit = { note: string; f: (t: Template) => boolean; m: string[] };
const FIT: Record<string, Fit> = {
  Oval: { note: "Balanced proportions, so most cuts work", f: () => true, m: ["male_textured_crop", "all_side_swept_undercut", "male_textured_comma", "male_tousled_cut", "all_crewcut"] },
  Round: { note: "Length past the chin and height on top lengthen a round face", f: (t) => t.length >= 4 || t.id === "all_wolf_cut", m: ["male_textured_crop", "all_side_swept_undercut", "all_messy_tapered_fade"] },
  Square: { note: "Soft waves and length past the jaw soften strong angles", f: (t) => t.length >= 4 || t.texture === "wavy", m: ["all_buzz_cut", "all_crewcut", "male_gray_taper_fade", "male_tousled_cut"] },
  Heart: { note: "Chin-to-collarbone length adds width at the jaw", f: (t) => t.length === 3 || t.length === 4, m: ["male_tousled_cut", "male_textured_comma", "all_tousled_waves"] },
  InvTriangle: { note: "Chin-to-collarbone length adds width at the jaw", f: (t) => t.length === 3 || t.length === 4, m: ["male_tousled_cut", "male_textured_comma", "all_tousled_waves"] },
  Diamond: { note: "Chin-length cuts and fringes balance wider cheekbones", f: (t) => t.length === 3 || ["all_hime_cut", "all_curtain_wavy", "all_bixie_cut"].includes(t.id), m: ["male_textured_comma", "male_tousled_cut", "all_side_swept_undercut"] },
  Oblong: { note: "Mid lengths with width at the sides shorten a long face", f: (t) => (t.length === 3 || t.length === 4) && t.texture !== "straight", m: ["male_textured_comma", "male_tousled_cut", "all_crewcut"] },
  Triangle: { note: "Layers and volume on top balance a wider jaw", f: (t) => ["all_wolf_cut", "all_face_framing_shag_cut", "all_hush_cut", "all_goddess_waves", "female_long_wavy"].includes(t.id), m: ["male_textured_crop", "all_messy_tapered_fade", "all_side_swept_undercut"] },
};

export const faceNote = (shape?: string) => (shape ? FIT[shape]?.note : undefined);

// How easy a look is from the customer's hair today: cut only beats growing, which beats chemicals.
function ease(p: Plan) {
  if (!p.feasible) return -5;
  const label = effortLabel(p);
  if (label === "Cut only") return 2;
  if (label.startsWith("Grow")) return 1;
  return 0;
}

export function suggest(a: Analysis, all: Template[], group: "f" | "m", n = 4) {
  const fit = a.face?.shape ? FIT[a.face.shape] : undefined;
  const ranked = all
    .filter((t) => t.group === group)
    .map((t) => {
      const plan = planFor(a, t);
      const fits = fit ? (group === "m" ? fit.m.includes(t.id) : fit.f(t)) : false;
      const score = (fits ? 2 : 0) + ease(plan) - (t.colorChange ? 0.5 : 0);
      return { t, plan, fits, score };
    })
    .filter((x) => x.plan.feasible)
    .sort((x, y) => y.score - x.score);
  const fitting = ranked.filter((x) => x.fits);
  return (fitting.length >= 2 ? fitting : ranked).slice(0, n);
}
