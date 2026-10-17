import { describe, expect, it } from "vitest";
import templates from "../src/data/templates.json";
import { SAMPLE } from "../src/lib/sample";
import { suggest } from "../src/lib/suggest";
import type { Analysis, Template } from "../src/lib/types";

const all = templates as Template[];

describe("Picked for you", () => {
  it("only suggests looks that suit the face shape, easiest first", () => {
    const picks = suggest(SAMPLE.analysis, all, "f");
    expect(picks.length).toBeGreaterThanOrEqual(2);
    expect(picks.every((p) => p.fits && p.plan.feasible)).toBe(true);
    const scores = picks.map((p) => p.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("falls back to the easiest looks when the face shape is unknown", () => {
    const noFace: Analysis = { ...SAMPLE.analysis, face: undefined };
    const picks = suggest(noFace, all, "m");
    expect(picks.length).toBe(4);
    expect(picks.every((p) => !p.fits)).toBe(true);
  });

  it("never suggests a look that isn't possible from the customer's hair", () => {
    for (const shape of ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong", "Triangle"]) {
      const a: Analysis = { ...SAMPLE.analysis, face: { shape } };
      for (const g of ["f", "m"] as const) expect(suggest(a, all, g).every((p) => p.plan.feasible)).toBe(true);
    }
  });
});
