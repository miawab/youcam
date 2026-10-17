import { SERVICES } from "./catalog";
import type { Analysis, Plan, SkinConcern, Step, Template, Texture } from "./types";

// Rough centre of each YouCam length class, in cm from the crown.
const LENGTH_CM = [0, 4, 8, 15, 25, 40];
export const LENGTH_NAMES = ["", "Above the ears", "Ear length", "Above the shoulders", "Collarbone", "Long"];
// Hair grows about 1.25 cm a month on average (commonly cited ~0.5 in/month).
const GROWTH_CM_PER_MONTH = 1.25;

const ORDER: Texture[] = ["straight", "wavy", "curly", "coily"];

export function textureFromMapping(mapping: string): Texture {
  const m = mapping.trim().toLowerCase();
  if (m.startsWith("1")) return "straight";
  if (m.startsWith("2")) return "wavy";
  if (m.startsWith("3")) return "curly";
  return "coily";
}

export function lengthLevel(term: string): number {
  const t = term.toLowerCase();
  if (t.startsWith("above the ears")) return 1;
  if (t.startsWith("ear length")) return 2;
  if (t.startsWith("short hair")) return 3;
  if (t.startsWith("above chest")) return 4;
  return 5;
}

function colourService(t: Template) {
  const s = t.title.toLowerCase();
  if (s.includes("gray") || s.includes("silver")) return "silver";
  if (s.includes("balayage") || s.includes("highlight")) return "balayage";
  return "colour";
}

const step = (service: string, why: string, o: Partial<Step> = {}): Step => ({
  service, why, source: "rule", required: true, visible: true, visit: 1, ...o,
});

export function planFor(a: Analysis, t: Template): Plan {
  const steps: Step[] = [];
  const notes: string[] = [];
  let feasible = true;
  let growMonths: number | undefined;
  const cur = a.hair.type?.texture;
  const frizz = a.hair.frizz?.level ?? 0;
  let chemical = false;

  // Curl shrinkage: straightening curly hair drops it about one length class; curling straight hair lifts it.
  let curLen = a.hair.length?.level;
  let lenWord = "Your hair reads";
  if (curLen !== undefined && cur && t.texture !== "locs") {
    const d = ORDER.indexOf(cur) - ORDER.indexOf(t.texture);
    if (d >= 1 && ORDER.indexOf(cur) >= 2) {
      curLen = Math.min(5, curLen + 1);
      lenWord = "Straightened, your hair would be";
      notes.push("Curls shrink. Straightened, your hair will hang about one length longer than it looks now.");
    } else if (d <= -1 && ORDER.indexOf(t.texture) >= 2) {
      curLen = Math.max(1, curLen - 1);
      lenWord = "Curled, your hair would sit at";
      notes.push("Curls take up length. After a perm your hair will sit about one length shorter.");
    }
  }

  // 1. Length
  if (curLen !== undefined) {
    if (t.length < curLen) {
      steps.push(step(t.length <= 1 ? "cut_short" : "cut", `${lenWord} ${LENGTH_NAMES[curLen].toLowerCase()}; this look is ${LENGTH_NAMES[t.length].toLowerCase()}.`, { source: "youcam" }));
    } else if (t.length > curLen) {
      const cm = LENGTH_CM[t.length] - LENGTH_CM[curLen];
      growMonths = Math.ceil(cm / GROWTH_CM_PER_MONTH);
      steps.push(step("cut", "A shaping cut now so it grows into the look evenly.", { source: "youcam" }));
      if (t.length >= 3) {
        steps.push(step("extensions", `About ${cm} cm longer than your hair today. Extensions get you there now, or grow it for ~${growMonths} months with trims every 8 weeks.`, { source: "youcam", required: false }));
      } else {
        notes.push(`This look needs about ${cm} cm more length. Grow it for ~${growMonths} months; extensions don't work this short.`);
      }
    } else {
      steps.push(step(t.length <= 1 ? "cut_short" : "cut", "Same length as now: a reshape, not a chop.", { source: "youcam" }));
    }
  } else {
    steps.push(step("cut", "Your stylist will confirm length in the chair."));
  }

  // 2. Texture
  if (cur && t.texture !== cur) {
    if (t.texture === "locs") {
      if (curLen !== undefined && curLen < 3) {
        feasible = false;
        notes.push("Locs need roughly 15 cm of hair to start. Grow first, then install.");
      }
      steps.push(step("locs", "Locs are installed by hand over one long session.", { source: "youcam" }));
      chemical = false;
    } else if (ORDER.indexOf(t.texture) > ORDER.indexOf(cur)) {
      if (t.texture === "coily") {
        feasible = false;
        notes.push("A perm can add curl, but it can't create tightly coiled hair from your texture. The closest real result is a tight curl perm.");
        steps.push(step("curl_perm", "Closest achievable texture to this look.", { source: "youcam" }));
      } else {
        const svc = t.texture === "wavy" ? "body_wave" : "curl_perm";
        steps.push(step(svc, `YouCam read your hair as ${a.hair.type!.term.toLowerCase()}; this look is ${t.texture}. A perm adds that pattern.`, { source: "youcam" }));
      }
      chemical = true;
    } else {
      if (t.length <= 2) {
        // Very short cuts remove most of the pattern; smoothing only matters for the sleek finish.
        steps.push(step("keratin", `YouCam read your hair as ${a.hair.type!.term.toLowerCase()}. At this length the cut does most of the work; keratin is only for the sleek finish in the preview.`, { source: "youcam", required: false }));
      } else {
        const big = ORDER.indexOf(cur) - ORDER.indexOf(t.texture) >= 2;
        const svc = big || t.texture === "straight" ? "rebonding" : "keratin";
        steps.push(step(svc, `YouCam read your hair as ${a.hair.type!.term.toLowerCase()}; this look is ${t.texture}. ${svc === "rebonding" ? "Rebonding straightens permanently; it grows out, not washes out." : "Keratin relaxes the pattern for 3 to 5 months."}`, { source: "youcam" }));
        chemical = true;
      }
    }
  }

  // 3. Colour (YouCam's template changes hair colour)
  if (t.colorChange) {
    const svc = colourService(t);
    steps.push(step(svc, "This look comes with a new colour, so the preview changes your colour too.", { visit: chemical ? 2 : 1 }));
    if (chemical) notes.push("Colour goes on 2 weeks after the perm or straightening, so the hair isn't processed twice in one day.");
    if (svc === "silver") notes.push("Going silver from dark hair usually takes more than one lightening session. Your stylist will check after the first.");
    chemical = true;
  }

  // 4. Care add-ons, from measurements
  if (chemical) {
    steps.push(step("bond_repair", "Recommended with any chemical service.", {
      required: false, visible: false,
      benefits: ["Rebuilds bonds broken by perm, straightening or lightening", "Less breakage in the weeks after", "Colour and pattern hold longer"],
    }));
  }
  if (frizz >= 2) {
    const curlyTarget = t.texture === "curly" || t.texture === "coily";
    const keratinAlready = steps.some((s) => s.service === "keratin" || s.service === "rebonding");
    if (!keratinAlready) {
      steps.push(step(curlyTarget ? "curl_hydration" : "anti_frizz", `YouCam measured your frizz as "${a.hair.frizz!.term}".`, {
        source: "youcam", required: false, visible: false,
        benefits: curlyTarget
          ? ["Defines curls without loosening them", "Less puffiness in humidity", "Softer feel for 4 to 6 weeks"]
          : ["Smoother finish without changing your texture", "Less puffiness in humidity", "Shine that lasts 4 to 6 weeks"],
      }));
    }
  }
  if (a.hair.density && a.hair.density.value < 1.0) {
    steps.push(step("scalp", `YouCam's density reading was "${a.hair.density.term}".`, {
      source: "youcam", required: false, visible: false,
      benefits: ["Cleans build-up around follicles", "Scalp massage for circulation", "Honest limit: it won't regrow hair lost to pattern thinning"],
    }));
    notes.push("A low density reading from a photo is not a diagnosis. If you're noticing shedding, see a dermatologist before paying for treatments.");
  }

  const lastVisit = Math.max(...steps.map((s) => s.visit));
  const visits = [{ n: 1, when: "First visit" }];
  if (lastVisit >= 2) visits.push({ n: 2, when: "2 weeks later" });

  return { steps, visits, growMonths, feasible, notes };
}

// A short label for the look grid: what it takes to get from here to there.
export function effortLabel(p: Plan): string {
  const major = p.steps.filter((s) => s.required && !["cut", "cut_short"].includes(s.service));
  if (!p.feasible) return "Not fully possible";
  if (major.length === 0 && !p.steps.some((s) => s.service === "extensions")) return p.growMonths ? `Grow ${p.growMonths} mo` : "Cut only";
  const names = major.map((s) => SERVICES[s.service].name.split(" (")[0]);
  return "Cut + " + names.join(" + ") + (p.visits.length > 1 ? ", 2 visits" : "");
}

export const SKIN_SERVICE: Record<SkinConcern, string> = {
  acne: "acne_facial",
  texture: "hydrafacial",
  dark_circle: "undereye",
  radiance: "brightening",
};

export const SKIN_LABEL: Record<SkinConcern, string> = {
  acne: "Breakouts",
  texture: "Texture",
  dark_circle: "Under-eye darkness",
  radiance: "Radiance",
};

export const SKIN_BENEFITS: Record<SkinConcern, string[]> = {
  acne: ["Deep-cleans congested pores", "Calms active breakouts", "Best as a course of 3 to 4 sessions"],
  texture: ["Exfoliates and hydrates in one session", "Smoother, more even surface", "Visible the same day"],
  dark_circle: ["Hydrates the thin under-eye skin", "Softens shadowing", "Won't change darkness that's genetic or from bone structure"],
  radiance: ["Lifts dullness and evens tone", "Glow lasts about a week", "Pairs well before an event"],
};

// Concerns worth acting on: ui_score below 85 (YouCam's "good" band starts at 70, "excellent" at 85).
export function skinPicks(scores: Partial<Record<SkinConcern, number>>) {
  return (Object.entries(scores) as [SkinConcern, number][])
    .filter(([, s]) => s < 85)
    .sort((a, b) => a[1] - b[1]);
}
