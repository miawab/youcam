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

const SOLVES: { who: string; items: [string, string][] }[] = [
  {
    who: "For the customer",
    items: [
      ["See it on your own face first", "Not a model's face on Instagram. Yours, with your hair, before anyone picks up scissors."],
      ["The real price, before the chair", "Every service it takes, the total and the hours, laid out at home. No surprise at the till."],
      ["An honest answer", "When a look isn't possible from your hair, it says so. When a treatment won't help, it says that too."],
      ["Decide without pressure", "Add or skip each recommendation with the reason in front of you, in your own time."],
    ],
  },
  {
    who: "For the salon",
    items: [
      ["Know who's walking in", "Photos, hair type, frizz, length and the agreed plan arrive before the appointment."],
      ["Prepare ahead", "The right products, colour and chemicals ready, and the slot booked for how long the work really takes."],
      ["The right stylist on the day", "A curl specialist for a perm, a colourist for balayage. Rota the person best suited to the look."],
      ["Bigger tickets, earned", "Add-ons come with a reason and a skip button, so customers add what they need and trust the bill."],
      ["Fewer redos and unhappy customers", "Expectations are set before the cut, with a preview the customer already agreed to."],
    ],
  },
];

const READINGS = [
  ["Curl pattern", "3A to 3B"],
  ["Frizz", "Frizzy"],
  ["Length", "Above chest"],
  ["Under-eyes", "77 / 100"],
];

// One small, real picture per step, all from the sample customer.
const STEP_VISUALS = [
  <div key="photos" className="flex gap-2">
    {(["right", "front", "left"] as const).map((k) => (
      <figure key={k} className="w-24 sm:w-28">
        <img src={SAMPLE.photos[k]} alt="" className="aspect-[4/5] w-full object-cover" />
        <figcaption className="label mt-2 text-center text-xs text-muted">{k === "front" ? "Front" : k === "right" ? "Right" : "Left"}</figcaption>
      </figure>
    ))}
  </div>,
  <dl key="read" className="w-full border border-ink bg-paper sm:w-96">
    {READINGS.map(([k, v]) => (
      <div key={k} className="flex items-baseline justify-between gap-6 border-b border-line px-5 py-3.5 last:border-b-0">
        <dt className="label text-muted">{k}</dt>
        <dd className="text-lg font-medium">{v}</dd>
      </div>
    ))}
  </dl>,
  <div key="route" className="flex flex-wrap items-end gap-3">
    <img src={SAMPLE.photos.front} alt="" className="aspect-[4/5] w-24 object-cover sm:w-28" />
    <div className="pb-10 text-2xl text-muted">→</div>
    <img src={SAMPLE.tryons.female_long_straight} alt="" className="aspect-[4/5] w-24 object-cover sm:w-28" />
    <div className="flex w-full flex-wrap gap-2 sm:ml-2 sm:w-auto sm:flex-col sm:items-start sm:pb-1">
      {["Cut", "Rebonding", "Bond repair"].map((s) => (
        <div key={s} className="chip">{s}</div>
      ))}
    </div>
  </div>,
  <div key="book" className="w-full bg-ink p-6 text-paper sm:w-96">
    <div className="label text-paper/60">Your visit</div>
    <div className="mt-4 space-y-2 text-base">
      <div className="flex justify-between gap-6"><span>Cut &amp; style</span><span>Rs 2,500</span></div>
      <div className="flex justify-between gap-6"><span>Rebonding</span><span>Rs 18,000</span></div>
      <div className="flex justify-between gap-6 text-paper/50 line-through"><span>Bond repair</span><span>Skipped</span></div>
    </div>
    <div className="mt-5 flex justify-between border-t border-paper/20 pt-4 text-xl font-medium"><span>Total</span><span>Rs 20,500</span></div>
  </div>,
];

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
        <div>
          <div className="label text-muted">For salons and barbers</div>
          <h1 className="mt-4 text-[2.75rem] font-medium leading-[1.02] tracking-tight sm:text-6xl">The consultation before the chair.</h1>
          <p className="mt-6 max-w-lg text-xl text-muted">
            Customers try a look on their own face, and Chairside works out every service it takes to get there from their hair today. Then they book all of it. One line of code on your booking page.
          </p>
          <div className="actions mt-8 flex flex-wrap gap-3">
            <Link href="/salon" className="btn btn-solid">
              See it on a salon site
            </Link>
            <Link href="/consult" className="btn btn-line">
              Try a consultation
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <figure className="col-span-1">
            <img src={SAMPLE.photos.front} alt="Customer today" className="aspect-[4/5] w-full object-cover" />
            <figcaption className="label mt-2 text-muted">Today: 3A curls, frizzy</figcaption>
          </figure>
          <figure className="col-span-1">
            <img src={SAMPLE.tryons.female_long_straight} alt="Straight look" className="aspect-[4/5] w-full object-cover" />
            <figcaption className="label mt-2 text-muted">Look: long straight</figcaption>
          </figure>
          <div className="col-span-2 flex flex-col justify-between gap-3 border border-ink p-4 text-sm sm:col-span-1">
            <div className="label">The route</div>
            <ol className="flex flex-wrap gap-x-4 gap-y-2 sm:block sm:space-y-2">
              <li>1. Cut &amp; style</li>
              <li>2. Rebonding</li>
              <li>3. Bond repair</li>
            </ol>
            <div className="label text-muted">1 visit</div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-tile">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div>
            <div className="label">The problem</div>
            <p className="mt-3 text-2xl font-medium leading-snug tracking-tight">Try-on shows where you want to end up. Nobody tells you how to get there.</p>
          </div>
          <p className="text-lg text-muted md:col-span-2 md:pt-8">
            A customer shows a photo of straight hair. Their hair is curly. That&apos;s rebonding, maybe extensions, maybe two visits, and a price they hear for the first time in the chair. Half the consultation is spent on facts a camera could have read. Chairside does that part before they arrive, and it says so when a look isn&apos;t possible or a treatment won&apos;t help.
          </p>
        </div>
      </section>

      <section id="solves" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 md:py-28">
        <div className="text-center">
          <div className="label text-muted">What it solves</div>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Better for the person in the chair. Better for the people behind it.</h2>
        </div>
        <div className="mt-12 grid gap-px bg-ink sm:mt-16 md:grid-cols-2">
          {SOLVES.map(({ who, items }) => (
            <div key={who} className="bg-paper px-0 py-8 sm:p-10">
              <h3 className="label">{who}</h3>
              <ul className="mt-8 space-y-7">
                {items.map(([t, d]) => (
                  <li key={t} className="grid grid-cols-[20px_1fr] gap-3">
                    <span aria-hidden className="mt-2.5 h-px w-4 bg-ink" />
                    <div>
                      <div className="text-xl font-medium tracking-tight">{t}</div>
                      <p className="mt-1.5 text-lg text-muted">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-t border-line bg-tile"><div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="text-center">
          <div className="label text-muted">How it works</div>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Four minutes on the phone. A plan you can book.</h2>
        </div>
        <ol className="mt-16 border-t border-ink">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid gap-6 border-b border-line py-10 md:grid-cols-[110px_1fr_auto] md:items-center md:gap-12 md:py-16">
              <div aria-hidden className="text-5xl sm:text-6xl font-light leading-none tracking-tight text-muted/40 md:text-7xl">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3 className="text-2xl font-medium tracking-tight sm:text-3xl">{t}</h3>
                <p className="mt-4 max-w-md text-lg text-muted">{d}</p>
              </div>
              <div className="md:justify-self-end">{STEP_VISUALS[i]}</div>
            </li>
          ))}
        </ol>
      </div></section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="label text-muted">Seven YouCam APIs, all load-bearing</div>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {APIS.map(([n, d]) => (
                <li key={n} className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-6">
                  <span className="font-medium">{n}</span>
                  <span className="text-muted">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label text-muted">What&apos;s measured, what&apos;s a rule</div>
            <p className="mt-6 text-lg leading-relaxed">
              Every reading is labelled. <span className="chip chip-yc">Measured by YouCam</span> means an AI model produced it from your photos. <span className="chip chip-rule">Salon rule</span> means it&apos;s a rule of thumb we wrote, like &quot;colour goes on two weeks after a perm&quot; or &quot;hair grows about 1.25 cm a month&quot;. A salon can edit its rules and prices.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted">
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
            <p className="mt-4 text-lg text-paper/70">
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
