import Link from "next/link";
import SiteHeader, { Mark } from "@/components/SiteHeader";
import { SAMPLE } from "@/lib/sample";

const APIS = [
  ["AI Hair Type Detection", "Curl pattern from three angles, 1 to 4C"],
  ["AI Hair Frizziness Detection", "Frizz level 0 to 3"],
  ["AI Hair Length Detection", "Five length classes"],
  ["AI Hair Density Detection", "A hairline read from a chin-down photo"],
  ["AI Skin Analysis", "Breakouts, texture, under-eyes, radiance, skin age"],
  ["AI Hairstyle Virtual Try-On", "Any of 40 looks on your own face"],
  ["AI Skin Simulation", "Your skin after the treatments you add"],
];

const STEPS = [
  ["Four photos", "Straight on, both sides, chin down. A guide frames each one the way the AI needs it."],
  ["YouCam reads you", "Hair type, frizz, length, hairline and skin, in about 20 seconds."],
  ["Pick a look, get the route", "Every look shows what it takes from your hair: perm, rebonding, colour, months of growth, or 'not possible'."],
  ["Add, skip, book", "Recommendations come one at a time with the reason. See yourself after everything, then book it all in one go."],
];

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
        <div>
          <div className="label text-muted">For salons and barbers</div>
          <h1 className="mt-4 text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl">The consultation before the chair.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Customers try a look on their own face, and Chairside works out every service it takes to get there from their hair today. Then they book all of it. One line of code on your booking page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/salon" className="btn btn-solid">
              See it on a salon site
            </Link>
            <Link href="/consult" className="btn btn-line">
              Try a consultation
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <figure className="col-span-1">
            <img src={SAMPLE.photos.front} alt="Customer today" className="aspect-[4/5] w-full object-cover" />
            <figcaption className="label mt-2 text-[10px] text-muted">Today: 3A curls, frizzy</figcaption>
          </figure>
          <figure className="col-span-1">
            <img src={SAMPLE.tryons.female_long_straight} alt="Straight look" className="aspect-[4/5] w-full object-cover" />
            <figcaption className="label mt-2 text-[10px] text-muted">Look: long straight</figcaption>
          </figure>
          <div className="col-span-1 flex flex-col justify-between border border-ink p-3 text-xs">
            <div className="label text-[10px]">The route</div>
            <ol className="space-y-2">
              <li>1. Cut &amp; style</li>
              <li>2. Rebonding</li>
              <li>3. Bond repair</li>
            </ol>
            <div className="label text-[10px] text-muted">1 visit</div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-tile">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div>
            <div className="label">The problem</div>
            <p className="mt-3 text-2xl font-medium leading-snug tracking-tight">Try-on shows where you want to end up. Nobody tells you how to get there.</p>
          </div>
          <p className="text-muted md:col-span-2 md:pt-8">
            A customer shows a photo of straight hair. Their hair is curly. That&apos;s rebonding, maybe extensions, maybe two visits, and a price they hear for the first time in the chair. Half the consultation is spent on facts a camera could have read. Chairside does that part before they arrive, and it says so when a look isn&apos;t possible or a treatment won&apos;t help.
          </p>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <div className="label text-muted">How it works</div>
        <div className="mt-8 grid gap-px bg-line md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="bg-paper p-6">
              <div className="text-4xl font-medium text-line">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-4 text-lg font-medium">{t}</div>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="label text-muted">Seven YouCam APIs, all load-bearing</div>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {APIS.map(([n, d]) => (
                <li key={n} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                  <span className="font-medium">{n}</span>
                  <span className="text-sm text-muted">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label text-muted">What&apos;s measured, what&apos;s a rule</div>
            <p className="mt-6 text-sm leading-relaxed">
              Every reading is labelled. <span className="chip chip-yc">Measured by YouCam</span> means an AI model produced it from your photos. <span className="chip chip-rule">Salon rule</span> means it&apos;s a rule of thumb we wrote, like &quot;colour goes on two weeks after a perm&quot; or &quot;hair grows about 1.25 cm a month&quot;. A salon can edit its rules and prices.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              What we won&apos;t claim: a photo can&apos;t see your crown, your history of colour, or diagnose hair loss. When the density reading is low, Chairside points you to a dermatologist instead of selling you a scalp treatment.
            </p>
          </div>
        </div>
      </section>

      <section id="salons" className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <div className="label text-paper/60">For salons</div>
            <h2 className="mt-3 text-4xl font-medium tracking-tight">One line on your booking page.</h2>
            <p className="mt-4 text-paper/70">
              A &quot;Try your look&quot; button opens the consultation over your site. Customers arrive with a plan they already agreed to, and your stylist gets the photos and readings ahead of time.
            </p>
          </div>
          <pre className="overflow-x-auto border border-paper/20 p-5 text-sm leading-relaxed">
            <code>{`<script src="https://chairside-salon.vercel.app/embed.js"\n        data-salon="studio-nine" defer></script>`}</code>
          </pre>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-ink">
          <Mark className="h-6 w-6" />
          <span className="label">Chairside</span>
        </div>
        <p>Built for the YouCam API Skin AI &amp; eCommerce VTO Hackathon. {SAMPLE.credit}.</p>
      </footer>
    </main>
  );
}
