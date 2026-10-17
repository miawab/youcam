import { describe, expect, it } from "vitest";
import templates from "../src/data/templates.json";
import { effortLabel, lengthLevel, planFor, skinPicks, textureFromMapping } from "../src/lib/route";
import { SAMPLE } from "../src/lib/sample";
import type { Analysis, Template } from "../src/lib/types";

const T = (id: string) => (templates as Template[]).find((t) => t.id === id)!;
const services = (a: Analysis, id: string) => planFor(a, T(id)).steps.map((s) => s.service);
const straightShort: Analysis = {
  hair: { type: { mapping: "1 to 2A", term: "Straight to Slight Wavy", texture: "straight" }, frizz: { level: 0, term: "Not Frizzy" }, length: { level: 2, term: "ear length" } },
  missing: {},
};

describe("YouCam result parsing", () => {
  it("maps hair type codes to textures", () => {
    expect(textureFromMapping("1 to 2a")).toBe("straight");
    expect(textureFromMapping("2b to 2c")).toBe("wavy");
    expect(textureFromMapping("3A to 3B")).toBe("curly");
    expect(textureFromMapping("4b to 4c")).toBe("coily");
  });
  it("maps every documented length term", () => {
    const terms = ["above the ears", "ear length", "ear length or longer", "short hair", "short hair or longer", "above chest", "above chest or longer", "long hair"];
    expect(terms.map(lengthLevel)).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
  });
});

describe("route planner", () => {
  it("curly to long straight needs rebonding, not extensions (curls shrink)", () => {
    const s = services(SAMPLE.analysis, "female_long_straight");
    expect(s).toContain("rebonding");
    expect(s).not.toContain("extensions");
  });
  it("frizzy curly hair going curly gets curl hydration, not anti-frizz", () => {
    const s = services(SAMPLE.analysis, "female_bobcut_curly");
    expect(s).toContain("curl_hydration");
    expect(s).not.toContain("anti_frizz");
  });
  it("straight short hair to long waves: perm, extensions offered, growth estimate", () => {
    const p = planFor(straightShort, T("female_long_wavy"));
    expect(p.steps.map((s) => s.service)).toEqual(expect.arrayContaining(["body_wave", "extensions"]));
    expect(p.growMonths).toBeGreaterThan(12);
  });
  it("colour after a perm goes on a second visit", () => {
    const p = planFor(straightShort, T("all_blonde_balayage"));
    expect(p.steps.find((s) => s.service === "balayage")!.visit).toBe(2);
    expect(p.visits).toHaveLength(2);
  });
  it("says coily from straight isn't fully possible", () => {
    expect(planFor(straightShort, T("female_afro")).feasible).toBe(false);
  });
  it("a short cut on curly hair doesn't force straightening", () => {
    const p = planFor(SAMPLE.analysis, T("all_pixie"));
    expect(p.steps.find((s) => s.service === "keratin")!.required).toBe(false);
    expect(effortLabel(p)).toBe("Cut only");
  });
  it("a low density reading adds a dermatologist note", () => {
    const a: Analysis = { ...straightShort, hair: { ...straightShort.hair, density: { value: 0.6, term: "Low Density" } } };
    expect(planFor(a, T("all_buzz_cut")).notes.join(" ")).toMatch(/dermatologist/);
  });
});

describe("skin picks", () => {
  it("only suggests treatments below 85, worst first", () => {
    expect(skinPicks(SAMPLE.analysis.skin!.scores).map(([c]) => c)).toEqual(["dark_circle", "radiance"]);
  });
});
