import Script from "next/script";
import { SALON, SERVICES, pkr } from "@/lib/catalog";
import { SAMPLE } from "@/lib/sample";

export const metadata = { title: "Studio Nine (demo salon)" };

const MENU: [string, string[]][] = [
  ["Cuts", ["cut", "cut_short"]],
  ["Texture", ["body_wave", "curl_perm", "keratin", "rebonding"]],
  ["Colour", ["colour", "balayage", "silver"]],
  ["Treatments", ["bond_repair", "anti_frizz", "curl_hydration", "scalp", "extensions"]],
  ["Skin", ["hydrafacial", "acne_facial", "brightening", "undereye"]],
];

// A made-up salon site, to show the embed working on a page Chairside doesn't own.
export default function SalonPage() {
  return (
    <main className="bg-[#faf8f5] text-[#1d1b18]">
      <div className="bg-[#1d1b18] py-2 text-center text-xs tracking-wide text-[#faf8f5]">Demo salon for the Chairside prototype. Sample prices.</div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="text-2xl tracking-[0.3em]">STUDIO NINE</div>
        <nav className="label hidden gap-6 sm:flex">
          <a href="#menu">Menu</a>
          <a href="#visit">Visit</a>
        </nav>
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-6 md:grid-cols-2 md:items-end">
        <div>
          <h1 className="text-5xl leading-tight sm:text-6xl" style={{ fontFamily: "Georgia, serif" }}>
            Hair &amp; skin,
            <br />
            {SALON.city}.
          </h1>
          <p className="mt-4 max-w-sm text-[#1d1b18]/70">Not sure what to ask for? Tap &quot;Try your look&quot; at the bottom right. See it on you, see what it takes, and book it.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[SAMPLE.tryons.female_blunt_bob, SAMPLE.tryons.female_long_straight, SAMPLE.tryons.all_blonde_balayage].map((s) => (
            <img key={s} src={s} alt="" className="aspect-[3/4] w-full object-cover" />
          ))}
        </div>
      </section>
      <section id="menu" className="border-t border-[#1d1b18]/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          {MENU.map(([title, ids]) => (
            <div key={title}>
              <div className="label mb-3">{title}</div>
              <ul className="space-y-2 text-sm">
                {ids.map((id) => (
                  <li key={id} className="flex justify-between gap-4 border-b border-[#1d1b18]/10 pb-2">
                    <span>{SERVICES[id].name}</span>
                    <span className="whitespace-nowrap tabular-nums">{pkr(SERVICES[id].price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section id="visit" className="border-t border-[#1d1b18]/10">
        <div className="mx-auto max-w-6xl px-5 py-14 text-sm text-[#1d1b18]/70">Studio Nine is fictional. Open daily 11:00 to 21:00.</div>
      </section>
      <Script src="/embed.js" data-salon="studio-nine" strategy="afterInteractive" />
    </main>
  );
}
