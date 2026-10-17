export type Texture = "straight" | "wavy" | "curly" | "coily" | "locs";

export type HairReading = {
  type?: { mapping: string; term: string; texture: Texture };
  frizz?: { level: number; term: string };
  length?: { level: number; term: string };
  density?: { value: number; term: string };
};

export type SkinConcern = "acne" | "texture" | "dark_circle" | "radiance";

export type SkinReading = {
  scores: Partial<Record<SkinConcern, number>>;
  skinAge?: number;
};

export type Analysis = {
  hair: HairReading;
  skin?: SkinReading;
  // YouCam Face Analyzer. Gender only picks which looks open first; the customer can switch.
  face?: { shape: string; gender?: "female" | "male" };
  // Which readings failed and why (YouCam error codes), so the UI can be honest about gaps.
  missing: Partial<Record<"type" | "frizz" | "length" | "density" | "skin" | "face", string>>;
  frontFileId?: string;
  // Signed token from /api/analyze; try-ons and skin previews only run with it.
  session?: string;
};

export type Template = {
  id: string;
  title: string;
  group: "m" | "f";
  length: number;
  texture: Texture;
  colorChange: boolean;
  thumb: string;
};

export type Step = {
  service: string;
  why: string;
  // "youcam": driven by a YouCam measurement. "rule": a salon rule of thumb we wrote.
  source: "youcam" | "rule";
  required: boolean;
  visible: boolean;
  benefits?: string[];
  visit: number;
};

export type Plan = {
  steps: Step[];
  visits: { n: number; when: string }[];
  growMonths?: number;
  feasible: boolean;
  notes: string[];
};
