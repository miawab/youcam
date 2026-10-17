// Menu for the demo salon. Prices are sample PKR figures for a mid-range Islamabad salon,
// not a real salon's price list. A real salon replaces this file with its own menu.
export type Service = { id: string; name: string; price: number; minutes: number; kind: "hair" | "skin" | "care" };

export const SALON = {
  name: "Studio Nine",
  city: "Islamabad",
  note: "Demo salon. Sample prices in PKR.",
};

export const SERVICES: Record<string, Service> = {
  cut: { id: "cut", name: "Cut & style", price: 2500, minutes: 45, kind: "hair" },
  cut_short: { id: "cut_short", name: "Clipper cut & fade", price: 1500, minutes: 30, kind: "hair" },
  body_wave: { id: "body_wave", name: "Body wave perm", price: 12000, minutes: 150, kind: "hair" },
  curl_perm: { id: "curl_perm", name: "Curl perm", price: 14000, minutes: 180, kind: "hair" },
  keratin: { id: "keratin", name: "Keratin smoothing", price: 15000, minutes: 150, kind: "hair" },
  rebonding: { id: "rebonding", name: "Rebonding (permanent straightening)", price: 18000, minutes: 240, kind: "hair" },
  colour: { id: "colour", name: "All-over colour", price: 8000, minutes: 120, kind: "hair" },
  balayage: { id: "balayage", name: "Balayage / highlights", price: 14000, minutes: 180, kind: "hair" },
  silver: { id: "silver", name: "Lighten & silver tone", price: 16000, minutes: 210, kind: "hair" },
  extensions: { id: "extensions", name: "Tape-in extensions", price: 45000, minutes: 120, kind: "hair" },
  locs: { id: "locs", name: "Loc installation", price: 20000, minutes: 300, kind: "hair" },
  bond_repair: { id: "bond_repair", name: "Bond-repair treatment", price: 4500, minutes: 30, kind: "care" },
  anti_frizz: { id: "anti_frizz", name: "Anti-frizz gloss treatment", price: 5000, minutes: 45, kind: "care" },
  curl_hydration: { id: "curl_hydration", name: "Curl hydration treatment", price: 4500, minutes: 45, kind: "care" },
  scalp: { id: "scalp", name: "Scalp treatment", price: 4000, minutes: 40, kind: "care" },
  hydrafacial: { id: "hydrafacial", name: "HydraFacial", price: 9000, minutes: 60, kind: "skin" },
  acne_facial: { id: "acne_facial", name: "Clarifying acne facial", price: 6000, minutes: 60, kind: "skin" },
  undereye: { id: "undereye", name: "Under-eye brightening", price: 4000, minutes: 30, kind: "skin" },
  brightening: { id: "brightening", name: "Brightening facial", price: 5500, minutes: 60, kind: "skin" },
};

export const pkr = (n: number) => "Rs " + n.toLocaleString("en-PK");
