import type { Analysis } from "./types";

// Real YouCam outputs saved on 2026-10-17 for one sample customer (Pexels photos 7245674 and
// 7245673, free to use). Lets the whole flow run with zero API units.
export const SAMPLE = {
  photos: {
    front: "/samples/a/front.jpg",
    right: "/samples/a/right.jpg",
    left: "/samples/a/left.jpg",
  },
  credit: "Photos: Pexels (7245674, 7245673)",
  analysis: {
    hair: {
      type: { mapping: "3A to 3B", term: "Loose to Medium Curls", texture: "curly" },
      frizz: { level: 2, term: "Frizzy" },
      length: { level: 4, term: "above chest" },
    },
    skin: { scores: { acne: 99, texture: 98, dark_circle: 77, radiance: 84 }, skinAge: 29 },
    face: { shape: "Diamond", gender: "female" },
    missing: { density: "No head-down photo in this sample" },
  } satisfies Analysis,
  // Cached try-ons (YouCam AI Hairstyle v2.1) and one skin simulation on top of the straight look.
  tryons: {
    female_long_straight: "/samples/a/female_long_straight.jpg",
    female_blunt_bob: "/samples/a/female_blunt_bob.jpg",
    all_blonde_balayage: "/samples/a/all_blonde_balayage.jpg",
  } as Record<string, string>,
  after: { female_long_straight: "/samples/a/after_female_long_straight.jpg" } as Record<string, string>,
};
