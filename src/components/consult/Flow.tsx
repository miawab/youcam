"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import templatesJson from "@/data/templates.json";
import Framer from "@/components/Framer";
import { SALON, SERVICES, pkr } from "@/lib/catalog";
import { LENGTH_NAMES, SKIN_BENEFITS, SKIN_LABEL, SKIN_SERVICE, effortLabel, planFor, skinPicks } from "@/lib/route";
import { SAMPLE } from "@/lib/sample";
import { faceNote, suggest } from "@/lib/suggest";
import type { Analysis, Plan, SkinConcern, Template } from "@/lib/types";
import { BottomBar, Choice, Compare, Meter, Source, Spinner, StepHead } from "./ui";

const TEMPLATES = templatesJson as Template[];
type Slot = "front" | "right" | "left" | "down";
const SLOTS: { id: Slot; short: string; title: string; hint: string; optional?: boolean }[] = [
  { id: "front", short: "Front", title: "Look straight ahead", hint: "Face the camera, hair down" },
  { id: "right", short: "Right", title: "Turn your head to the right", hint: "Turn about 45°, keep your chin level" },
  { id: "left", short: "Left", title: "Turn your head to the left", hint: "Turn about 45°, keep your chin level" },
  { id: "down", short: "Chin down", title: "Tip your chin down", hint: "So the top of your head and hairline show", optional: true },
];
const REQUIRED: Slot[] = ["front", "right", "left"];

type Stage = "intro" | "photos" | "reading" | "report" | "looks" | "plan" | "skin" | "after" | "book" | "done";
// The steps shown in the tracker. "reading" sits under "Your read" and is never a place to go back to.
const TRACK: { stage: Stage; label: string }[] = [
  { stage: "photos", label: "Photos" },
  { stage: "report", label: "Your read" },
  { stage: "looks", label: "Look" },
  { stage: "plan", label: "Plan" },
  { stage: "skin", label: "Skin" },
  { stage: "after", label: "After" },
  { stage: "book", label: "Book" },
];
const trackIndex = (s: Stage) => (s === "reading" ? 1 : TRACK.findIndex((t) => t.stage === s));

export default function Flow({ embedded = false }: { embedded?: boolean }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [mode, setMode] = useState<"live" | "sample">("sample");
  const [liveReason, setLiveReason] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<Slot, { blob?: Blob; url: string }>>>({});
  const [slot, setSlot] = useState<number | null>(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<"f" | "m">("f");
  const [look, setLook] = useState<Template | null>(null);
  const [tryons, setTryons] = useState<Record<string, string>>({});
  const [tryonBusy, setTryonBusy] = useState(false);
  const [tryonNote, setTryonNote] = useState<string | null>(null);
  // undefined = not decided yet, true = in the plan, false = skipped.
  const [picked, setPicked] = useState<Record<string, boolean | undefined>>({});
  const [skinPicked, setSkinPicked] = useState<Record<string, boolean | undefined>>({});
  const [after, setAfter] = useState<string | null>(null);
  const [afterBusy, setAfterBusy] = useState(false);
  const [skinSimulated, setSkinSimulated] = useState(false);
  const [booking, setBooking] = useState({ day: 0, time: "", name: "", phone: "" });

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => {
        if (s.live) setMode("live");
        else setLiveReason(s.reason ?? null);
      })
      .catch(() => setLiveReason("Offline"));
  }, []);

  const [reached, setReached] = useState(-1);
  const sampleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  // Each step is a browser history entry, so the phone's back gesture works as expected.
  // Spread the existing state: Next.js keeps its router data there and reloads the page without it.
  function go(s: Stage, replace = false) {
    if (replace) history.replaceState({ ...history.state, stage: s }, "");
    else history.pushState({ ...history.state, stage: s }, "");
    setStage(s);
  }
  const back = () => history.back();

  useEffect(() => {
    history.replaceState({ ...history.state, stage: "intro" }, "");
    const onPop = (e: PopStateEvent) => {
      if (sampleTimer.current) clearTimeout(sampleTimer.current);
      const s = (e.state?.stage as Stage | undefined) ?? "intro";
      setStage(s === "reading" ? "photos" : s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    setReached((r) => Math.max(r, trackIndex(stage)));
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Move focus to the new step's heading so screen readers announce it.
    document.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true });
  }, [stage]);

  const plan: Plan | null = useMemo(() => (analysis && look ? planFor(analysis, look) : null), [analysis, look]);
  const skinList = useMemo(() => (analysis?.skin ? skinPicks(analysis.skin.scores) : []), [analysis]);
  const picks = useMemo(() => (analysis ? suggest(analysis, TEMPLATES, group) : []), [analysis, group]);

  function receive(a: Analysis) {
    setAnalysis(a);
    if (a.face?.gender) setGroup(a.face.gender === "male" ? "m" : "f");
  }

  function startSample() {
    setMode("sample");
    setPhotos({ front: { url: SAMPLE.photos.front }, right: { url: SAMPLE.photos.right }, left: { url: SAMPLE.photos.left } });
    receive(SAMPLE.analysis);
    setTryons(SAMPLE.tryons);
    go("reading");
    sampleTimer.current = setTimeout(() => go("report", true), 2600);
  }

  async function analyse() {
    go("reading");
    setError(null);
    const fd = new FormData();
    for (const s of SLOTS) if (photos[s.id]?.blob) fd.append(s.id, photos[s.id]!.blob!, `${s.id}.jpg`);
    try {
      const r = await fetch("/api/analyze", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.reason || d.error || "Analysis failed");
      receive(d);
      go("report", true);
    } catch (e) {
      setError((e as Error).message);
      go("photos", true);
    }
  }

  async function chooseLook(t: Template) {
    setLook(t);
    setPicked({});
    setAfter(null);
    setTryonNote(null);
    go("plan");
    if (tryons[t.id] || mode !== "live" || !analysis?.session) return;
    setTryonBusy(true);
    try {
      const r = await fetch("/api/tryon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: analysis.session, templateId: t.id }) });
      const d = await r.json();
      if (d.url) setTryons((m) => ({ ...m, [t.id]: d.url }));
      else setTryonNote(d.reason ?? "The try-on didn't work this time. The plan below is still complete.");
    } catch {
      setTryonNote("The try-on didn't work this time. The plan below is still complete.");
    } finally {
      setTryonBusy(false);
    }
  }

  const steps = plan?.steps ?? [];
  const chosenHair = steps.filter((s) => picked[s.service] === true);
  const chosenSkin = skinList.filter(([c]) => skinPicked[c] === true);
  const cart = [...chosenHair.map((s) => SERVICES[s.service]), ...chosenSkin.map(([c]) => SERVICES[SKIN_SERVICE[c]])];
  const total = cart.reduce((s, x) => s + x.price, 0);
  const minutes = cart.reduce((s, x) => s + x.minutes, 0);
  const tryonUrl = look ? tryons[look.id] : undefined;
  // The first recommendation still waiting for an answer; everything after it stays hidden.
  const current = steps.findIndex((s) => picked[s.service] === undefined);
  const hairDone = current === -1;
  const skinDone = skinList.every(([c]) => skinPicked[c] !== undefined);

  // After each Add or Skip, bring the next open recommendation into view (above the bottom bar).
  const decided = Object.keys(picked).length + Object.keys(skinPicked).length;
  useEffect(() => {
    if (decided === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("[data-current]")?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [decided, current]);

  async function makeAfter() {
    go("after");
    setSkinSimulated(false);
    if (!look) return;
    if (chosenSkin.length === 0) {
      setAfter(tryonUrl ?? null);
      return;
    }
    if (mode === "sample") {
      setAfter(SAMPLE.after[look.id] ?? tryonUrl ?? null);
      setSkinSimulated(!!SAMPLE.after[look.id]);
      return;
    }
    if (!tryonUrl) return;
    setAfterBusy(true);
    try {
      const r = await fetch("/api/after", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: tryonUrl, concerns: chosenSkin.map(([c]) => c), session: analysis?.session }) });
      const d = await r.json();
      setAfter(d.url ?? tryonUrl);
      setSkinSimulated(!!d.url);
    } finally {
      setAfterBusy(false);
    }
  }

  const front = photos.front?.url;
  const requiredDone = REQUIRED.filter((s) => photos[s]).length;
  const photosReady = requiredDone === REQUIRED.length;
  const hasBar = ["photos", "plan", "skin"].includes(stage);

  function captured(blob: Blob) {
    if (slot === null) return;
    const id = SLOTS[slot].id;
    setPhotos((p) => ({ ...p, [id]: { blob, url: URL.createObjectURL(blob) } }));
    setSaved(`${SLOTS[slot].short} photo saved`);
    // Next empty required slot, or the "all set" view once the three angles are in.
    const next = SLOTS.findIndex((s, i) => i !== slot && !s.optional && !photos[s.id]);
    setSlot(next === -1 ? null : next);
  }

  return (
    <div className={`${embedded ? "px-4 py-6 sm:px-5" : "mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-14"} ${hasBar ? "pb-32 sm:pb-14" : ""}`}>
      {stage !== "intro" && stage !== "done" && (
        <Tracker
          current={trackIndex(stage)}
          reached={reached}
          locked={mode === "sample" ? [0] : []}
          onGo={(i) => go(TRACK[i].stage)}
          onBack={stage === "reading" ? undefined : back}
        />
      )}

      {stage === "intro" && (
        <section className="rise grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="label text-muted">{SALON.name} consultation</div>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">See the look. Know the route.</h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              Four photos. YouCam AI reads your hair, skin and face shape, suggests looks that suit you, shows them on your own face, then lays out every service it takes to get there, with prices and timing.
            </p>
            <ul className="mt-6 space-y-2">
              <li>About 3 minutes. Nothing is booked until you confirm.</li>
              <li>We tell you when a look isn&apos;t possible, and when a treatment won&apos;t help.</li>
            </ul>
            <div className="actions mt-8 flex flex-wrap gap-3">
              <button className="btn btn-solid" disabled={mode !== "live"} onClick={() => { setSlot(0); go("photos"); }}>
                Start with my photos
              </button>
              <button className="btn btn-line" onClick={startSample}>
                Try a sample customer
              </button>
            </div>
            {mode !== "live" && (
              <p className="mt-3 text-sm text-muted">Live analysis is paused{liveReason ? ` (${liveReason.toLowerCase()})` : ""}. The sample customer uses real saved YouCam results.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <img src={SAMPLE.photos.front} alt="Sample customer before" className="aspect-[4/5] w-full object-cover" />
            <img src={SAMPLE.tryons.female_long_straight} alt="Sample customer with a straight look" className="aspect-[4/5] w-full object-cover" />
            <div className="label col-span-2 text-muted">Sample: curly to sleek straight, 2 services, 1 visit</div>
          </div>
        </section>
      )}

      {stage === "photos" && (
        <section className="rise grid gap-4 md:grid-cols-[1fr_380px] md:gap-x-10 md:gap-y-6">
          <div>
            <StepHead
              title={slot === null ? "All set" : `${slot + 1} of 4: ${SLOTS[slot].title}`}
              sub={slot === null ? "Your three photos are ready. Add the chin-down one for a hairline reading, or go ahead." : undefined}
            />
            {slot !== null && (
              <p className="-mt-2 mb-5 hidden max-w-xl text-lg text-muted sm:block">
                {SLOTS[slot].optional ? "Optional. Lets YouCam look at your hairline." : "Three angles let YouCam read your curl pattern and frizz."}
              </p>
            )}
            <div className="grid max-w-[230px] grid-cols-4 gap-2 sm:max-w-sm" role="list" aria-label="Your photos">
              {SLOTS.map((s, i) => {
                const done = !!photos[s.id];
                return (
                  <button
                    key={s.id}
                    role="listitem"
                    onClick={() => setSlot(i)}
                    className="text-left"
                    aria-current={i === slot ? "step" : undefined}
                    aria-label={`${s.short} photo, ${done ? "saved, tap to retake" : s.optional ? "optional" : "needed"}`}
                  >
                    <div className={`relative aspect-[4/5] w-full overflow-hidden bg-tile ${i === slot ? "outline-2 outline-offset-2 outline-ink" : ""} ${done ? "" : "border border-dashed border-muted/50"}`}>
                      {done ? <img src={photos[s.id]!.url} alt="" className="h-full w-full object-cover" /> : <span className="label absolute inset-0 flex items-center justify-center text-muted">{i + 1}</span>}
                      {done && (
                        <span aria-hidden className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-paper">✓</span>
                      )}
                    </div>
                    <div className={`label mt-1.5 truncate text-[11px] ${done ? "text-accent" : "text-muted"}`}>{s.short}</div>
                  </button>
                );
              })}
            </div>
            <p className={`text-sm text-accent ${saved ? "mt-2" : ""}`} role="status" aria-live="polite">
              {saved ? `✓ ${saved}` : ""}
            </p>
            {slot !== null && photosReady && (
              <button className="btn btn-line mt-1 w-full sm:hidden" onClick={analyse}>
                Skip chin-down, read my photos
              </button>
            )}
            {error && <p role="alert" className="mt-2 border border-warn p-3 text-warn">{error}</p>}
          </div>

          <div className="md:col-start-2 md:row-span-3 md:row-start-1">
            {slot === null ? (
              <div className="border border-ink p-5">
                <div className="label">Ready to read</div>
                <ul className="mt-3 space-y-1.5">
                  {SLOTS.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span>{s.short}</span>
                      <span className={photos[s.id] ? "text-accent" : "text-muted"}>{photos[s.id] ? "✓ Saved" : "Optional, not added"}</span>
                    </li>
                  ))}
                </ul>
                {!photos.down && (
                  <button className="btn btn-line mt-5 w-full" onClick={() => setSlot(3)}>
                    Add chin-down photo
                  </button>
                )}
              </div>
            ) : (
              <Framer key={SLOTS[slot].id} guide={SLOTS[slot].id} hint={SLOTS[slot].hint} onCapture={captured} />
            )}
          </div>

          <details className="border-t border-line pt-4 md:open:pb-2">
            <summary className="label cursor-pointer py-2">Tips for a good photo</summary>
            <ul className="mt-3 space-y-3">
              <li className="grid grid-cols-[80px_1fr] gap-2"><span className="label pt-0.5">Light</span>Face a window. Dark photos lower skin scores.</li>
              <li className="grid grid-cols-[80px_1fr] gap-2"><span className="label pt-0.5">Hair</span>Down and untied, the way you usually wear it.</li>
              <li className="grid grid-cols-[80px_1fr] gap-2"><span className="label pt-0.5">Frame</span>Fill the oval. Keep your chin level unless asked.</li>
            </ul>
          </details>
          <p className="text-sm text-muted">Photos go to YouCam for analysis. We don&apos;t store them; YouCam keeps results for 24 hours.</p>
          <div className="hidden items-center gap-4 sm:flex">
            <button className="btn btn-solid" disabled={!photosReady} onClick={analyse}>
              Read my hair &amp; skin
            </button>
            <span className="text-muted">{photosReady ? "Photos ready" : `${requiredDone} of 3 photos`}</span>
          </div>

          {/* While a photo slot is open, the camera controls own the bottom bar (see Framer). */}
          {slot === null && (
            <BottomBar>
              <div className="text-sm">
                <div className="font-medium">Photos ready</div>
                <div className="text-muted">{photos.down ? "Plus chin-down" : "Chin-down optional"}</div>
              </div>
              <button className="btn btn-solid" onClick={analyse}>
                Read my hair &amp; skin
              </button>
            </BottomBar>
          )}
        </section>
      )}

      {stage === "reading" && (
        <section className="rise mx-auto max-w-md py-10">
          <StepHead title="Reading your photos" sub="About 20 seconds." />
          <div className="space-y-4" role="status" aria-live="polite">
            {["Hair type from 3 angles", "Frizz", "Length", "Hairline density", "Skin: breakouts, texture, under-eyes, radiance", "Face shape"].map((t, i) => (
              <div key={t} className="rise flex items-center justify-between border-b border-line pb-3" style={{ animationDelay: `${i * 0.25}s` }}>
                <span>{t}</span>
                <span className="pulse label text-muted">YouCam</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {stage === "report" && analysis && (
        <section className="rise">
          <StepHead title="Here's what we see" sub="Every reading below comes from a YouCam AI model, not from us." />
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {front && <img src={front} alt="Your photo" className="aspect-[4/5] w-32 object-cover lg:w-full" />}
            <div className="grid gap-px bg-line sm:grid-cols-2">
              <Card title="Hair type" missing={analysis.missing.type}>
                {analysis.hair.type && (
                  <>
                    <div className="text-2xl font-medium">{analysis.hair.type.term}</div>
                    <div className="text-sm text-muted">Pattern {analysis.hair.type.mapping}</div>
                  </>
                )}
              </Card>
              <Card title="Frizz" missing={analysis.missing.frizz}>
                {analysis.hair.frizz && (
                  <>
                    <div className="text-2xl font-medium">{analysis.hair.frizz.term}</div>
                    <div className="mt-3">
                      <Meter value={analysis.hair.frizz.level} max={3} />
                    </div>
                  </>
                )}
              </Card>
              <Card title="Length" missing={analysis.missing.length}>
                {analysis.hair.length && (
                  <>
                    <div className="text-2xl font-medium">{LENGTH_NAMES[analysis.hair.length.level]}</div>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5].map((l) => (
                        <div key={l} className={`h-1.5 flex-1 ${l <= analysis.hair.length!.level ? "bg-ink" : "bg-line"}`} />
                      ))}
                    </div>
                  </>
                )}
              </Card>
              <Card title="Face shape" missing={analysis.missing.face}>
                {analysis.face && (
                  <>
                    <div className="text-2xl font-medium">{shapeName(analysis.face.shape)}</div>
                    <div className="text-sm text-muted">{faceNote(analysis.face.shape)}</div>
                  </>
                )}
              </Card>
              <div className="bg-paper p-5 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="label">Skin</span>
                  {analysis.skin?.skinAge && <span className="text-sm text-muted">Skin age estimate: {analysis.skin.skinAge}</span>}
                </div>
                {analysis.skin ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(Object.entries(analysis.skin.scores) as [SkinConcern, number][]).map(([c, s]) => (
                      <div key={c}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{SKIN_LABEL[c]}</span>
                          <span className="tabular-nums">{s}/100</span>
                        </div>
                        <Meter value={s} tone={s >= 85 ? "accent" : "ink"} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Not measured: {friendly(analysis.missing.skin ?? "")}</p>
                )}
                <p className="mt-4 text-sm text-muted">Higher is better. 85+ is YouCam&apos;s excellent band.</p>
              </div>
              <Card title="Hairline density" missing={analysis.missing.density} wide>
                {analysis.hair.density && (
                  <>
                    <div className="text-2xl font-medium">{analysis.hair.density.term}</div>
                    <div className="text-sm text-muted">A rough read from one photo. Not a diagnosis.</div>
                  </>
                )}
              </Card>
            </div>
          </div>
          <Limits />
          <div className="actions-rev mt-8 flex flex-wrap justify-end gap-2">
            {mode === "live" && (analysis.missing.type || analysis.missing.length || analysis.missing.skin) && (
              <button className="btn btn-line" onClick={() => { setSlot(0); go("photos"); }}>
                Retake photos
              </button>
            )}
            <button className="btn btn-solid" onClick={() => go("looks")}>
              See looks for me
            </button>
          </div>
        </section>
      )}

      {stage === "looks" && analysis && (
        <section className="rise">
          <StepHead title="Pick a look" sub="Each look shows what it takes to get there from your hair today." />
          <div className="mb-8 flex gap-2" role="group" aria-label="Which looks to show">
            {(["f", "m"] as const).map((g) => (
              <button key={g} aria-pressed={group === g} className={`btn ${group === g ? "btn-solid" : "btn-line"} flex-1 sm:flex-none`} onClick={() => setGroup(g)}>
                {g === "f" ? "Women" : "Men"}
              </button>
            ))}
          </div>

          {picks.length > 0 && (
            <div className="mb-12">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-medium tracking-tight">Picked for you</h3>
                <Source kind="rule" />
              </div>
              <p className="mt-1 text-muted">
                {analysis.face ? `For a ${shapeName(analysis.face.shape).toLowerCase()} face: ${faceNote(analysis.face.shape)?.toLowerCase()}. ` : ""}
                Easiest from your hair first.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-4">
                {picks.map(({ t, plan: p, fits }) => (
                  <LookCard key={t.id} t={t} p={p} img={tryons[t.id]} onPick={() => chooseLook(t)} tag={fits ? "Suits your face" : undefined} />
                ))}
              </div>
            </div>
          )}

          <h3 className="text-xl font-medium tracking-tight">All looks</h3>
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {TEMPLATES.filter((t) => t.group === group).map((t) => (
              <LookCard key={t.id} t={t} p={planFor(analysis, t)} img={tryons[t.id]} onPick={() => chooseLook(t)} />
            ))}
          </div>
          {mode === "sample" && <p className="mt-6 text-sm text-muted">Sample mode: three looks have saved YouCam try-ons. Every look still gets a full plan.</p>}
        </section>
      )}

      {stage === "plan" && analysis && look && plan && (
        <section className="rise">
          <StepHead title={look.title} sub="Go through each service. Add it to your plan or skip it. You can change your mind." />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="mx-auto w-full max-w-[200px] sm:max-w-[260px] lg:max-w-none">
                {tryonUrl && front ? (
                  <Compare before={front} after={tryonUrl} />
                ) : tryonBusy ? (
                  <div className="flex aspect-[4/5] items-center justify-center bg-tile">
                    <Spinner text="YouCam is putting the look on you" />
                  </div>
                ) : (
                  <div className="relative">
                    <img src={look.thumb} alt={look.title} className="aspect-[4/5] w-full object-cover opacity-90" />
                    <span className="label absolute left-3 top-3 bg-paper px-2 py-1">Reference look</span>
                  </div>
                )}
                {tryonNote && <p className="mt-2 text-sm text-warn" role="status">{tryonNote}</p>}
                {look.colorChange && <p className="mt-2 text-sm text-muted">This look changes hair colour too, so colour is part of the plan.</p>}
              </div>
              <PlanSummary className="mt-6 hidden lg:block" items={chosenHair.map((s) => SERVICES[s.service])} skipped={steps.filter((s) => picked[s.service] === false).length} />
            </div>

            <div className="min-w-0">
              {!plan.feasible && <div className="mb-4 border border-warn p-4 text-warn">Heads up: this look isn&apos;t fully possible from your hair. Details below.</div>}
              <div className="mb-3 label text-muted" aria-live="polite">
                {hairDone ? `All ${steps.length} services decided` : `Service ${current + 1} of ${steps.length}`}
              </div>
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const svc = SERVICES[s.service];
                  const v = picked[s.service];
                  if (v !== undefined)
                    return (
                      <DecidedRow key={s.service} n={i + 1} name={svc.name} price={svc.price} added={v} onChange={() => setPicked((p) => ({ ...p, [s.service]: undefined }))} />
                    );
                  if (i !== current) return null;
                  return (
                    <li key={s.service} data-current className="rise scroll-mb-28 scroll-mt-24 border-2 border-ink p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="label text-muted">{s.required ? "Needed for this look" : "Recommended, optional"}{plan.visits.length > 1 ? `, visit ${s.visit}` : ""}</div>
                          <div className="mt-1 text-xl font-medium">{svc.name}</div>
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-right">
                          <div className="text-lg tabular-nums">{pkr(svc.price)}</div>
                          <div className="text-sm text-muted">{svc.minutes} min</div>
                        </div>
                      </div>
                      <p className="mt-3">{s.why}</p>
                      {!s.visible && s.benefits && (
                        <div className="mt-3 bg-tile p-4">
                          <div className="label mb-1 text-muted">You won&apos;t see this in a photo. What it does:</div>
                          <ul className="list-inside list-disc space-y-0.5">
                            {s.benefits.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3"><Source kind={s.source} /></div>
                      <Choice
                        name={svc.name}
                        onAdd={() => setPicked((p) => ({ ...p, [s.service]: true }))}
                        onSkip={() => setPicked((p) => ({ ...p, [s.service]: false }))}
                        skipNote={s.required ? "Without it, you won't get the look in the preview." : undefined}
                      />
                    </li>
                  );
                })}
              </ol>
              {hairDone && (plan.notes.length > 0 || plan.growMonths) && (
                <div className="rise mt-6 border-t border-line pt-4">
                  <div className="label mb-2">Straight talk</div>
                  <ul className="space-y-2">
                    {plan.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hairDone && (
                <div className="mt-6 hidden justify-end gap-2 sm:flex">
                  <button className="btn btn-line" onClick={() => go("looks")}>Other looks</button>
                  <button className="btn btn-solid" onClick={() => go("skin")}>Next: skin</button>
                </div>
              )}
            </div>
          </div>
          <BottomBar>
            <div className="text-sm">
              <div className="font-medium tabular-nums">{chosenHair.length} in plan, {pkr(chosenHair.reduce((a, s) => a + SERVICES[s.service].price, 0))}</div>
              <div className="text-muted">{hairDone ? plan.visits.map((v) => v.when).join(", then ") : `${steps.length - current} left to decide`}</div>
            </div>
            <button className="btn btn-solid" disabled={!hairDone} onClick={() => go("skin")}>
              Next: skin
            </button>
          </BottomBar>
        </section>
      )}

      {stage === "skin" && analysis && (
        <section className="rise">
          <StepHead title="And your skin" sub="From the same front photo. We only suggest a facial where YouCam scored you below 85." />
          {skinList.length === 0 ? (
            <div className="border border-line p-6">
              <div className="text-xl font-medium">{analysis.skin ? "Your skin scored well. No facial needed." : "We couldn't read your skin this time."}</div>
              <p className="mt-2 text-muted">{analysis.skin ? "We'd rather tell you that than sell you one." : analysis.missing.skin}</p>
            </div>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2">
              {skinList.map(([c, score], i) => {
                const svc = SERVICES[SKIN_SERVICE[c]];
                const v = skinPicked[c];
                if (v !== undefined)
                  return <DecidedRow key={c} n={i + 1} name={svc.name} price={svc.price} added={v} onChange={() => setSkinPicked((p) => ({ ...p, [c]: undefined }))} />;
                return (
                  <li key={c} data-current className="rise scroll-mb-28 scroll-mt-24 border-2 border-ink p-5">
                    <div className="flex justify-between gap-3">
                      <span className="label text-muted">{SKIN_LABEL[c]}</span>
                      <span className="text-sm tabular-nums">{score}/100</span>
                    </div>
                    <div className="mt-2"><Meter value={score} /></div>
                    <div className="mt-4 flex items-baseline justify-between gap-3">
                      <div className="text-xl font-medium">{svc.name}</div>
                      <div className="shrink-0 whitespace-nowrap text-lg tabular-nums">{pkr(svc.price)}</div>
                    </div>
                    <ul className="mt-2 list-inside list-disc">
                      {SKIN_BENEFITS[c].map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-3"><Source kind="youcam" /></div>
                    <Choice name={svc.name} onAdd={() => setSkinPicked((p) => ({ ...p, [c]: true }))} onSkip={() => setSkinPicked((p) => ({ ...p, [c]: false }))} />
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-8 hidden justify-end sm:flex">
            <button className="btn btn-solid" disabled={!skinDone} onClick={makeAfter}>
              See me after everything
            </button>
          </div>
          <BottomBar>
            <div className="text-sm">
              <div className="font-medium tabular-nums">{cart.length} in plan, {pkr(total)}</div>
              <div className="text-muted">{skinDone ? "Hair and skin" : `${skinList.filter(([c]) => skinPicked[c] === undefined).length} left to decide`}</div>
            </div>
            <button className="btn btn-solid" disabled={!skinDone} onClick={makeAfter}>
              See the result
            </button>
          </BottomBar>
        </section>
      )}

      {stage === "after" && look && (
        <section className="rise">
          <StepHead title="You, after everything" sub={
              skinSimulated
                ? "The new look, plus YouCam's skin simulation of the treatments you added."
                : chosenSkin.length && mode === "sample"
                  ? "The new look on you. In sample mode the skin simulation is saved for the Long Straight look only."
                  : "The new look on you."
            } />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="mx-auto w-full max-w-[300px] lg:max-w-none">
              {afterBusy ? (
                <div className="flex aspect-[4/5] items-center justify-center bg-tile">
                  <Spinner text="YouCam is simulating your skin after treatment" />
                </div>
              ) : after && front ? (
                <Compare before={front} after={after} labels={["Today", "After"]} />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-tile p-6 text-center text-muted">The full preview needs live mode for this look. Your plan is still complete.</div>
              )}
              <p className="mt-2 text-sm text-muted">A preview, not a promise. Real results depend on your hair and your stylist.</p>
            </div>
            <div>
              <PlanSummary items={cart} title={`Your plan at ${SALON.name}`} big />
              <div className="mt-1 text-right text-sm text-muted">
                About {Math.max(1, Math.round(minutes / 60))} h in the chair{plan && plan.visits.length > 1 ? " over 2 visits" : ""}. {SALON.note}
              </div>
              <div className="actions-rev mt-8 flex flex-wrap justify-end gap-2">
                <button className="btn btn-line" onClick={() => go("plan")}>
                  Change services
                </button>
                <button className="btn btn-solid" disabled={cart.length === 0} onClick={() => go("book")}>
                  Book all of it
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === "book" && (
        <section className="rise mx-auto max-w-xl">
          <StepHead title="Pick a time" sub={`${cart.length} services, ${pkr(total)}. Nothing is booked until you confirm.`} />
          <div className="label mb-3" id="day-label">Day</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-labelledby="day-label">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(Date.now() + (i + 1) * 86400000);
              return (
                <button
                  key={i}
                  aria-pressed={booking.day === i}
                  aria-label={d.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
                  className={`border p-2 text-center ${booking.day === i ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
                  onClick={() => setBooking({ ...booking, day: i })}
                >
                  <div className="label">{d.toLocaleDateString("en", { weekday: "short" })}</div>
                  <div className="text-lg">{d.getDate()}</div>
                </button>
              );
            })}
          </div>
          <div className="label mb-3 mt-6" id="time-label">Time</div>
          <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="time-label">
            {["11:00", "13:00", "15:30", "18:00"].map((t) => (
              <button key={t} aria-pressed={booking.time === t} className={`btn ${booking.time === t ? "btn-solid" : "btn-line"} min-h-11 px-2`} onClick={() => setBooking({ ...booking, time: t })}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="label">Name</span>
              <input autoComplete="name" className="border border-line px-3 py-3 focus:border-ink" value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Phone (WhatsApp), optional</span>
              <input type="tel" autoComplete="tel" inputMode="tel" className="border border-line px-3 py-3 focus:border-ink" value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} />
            </label>
          </div>
          <p className="mt-3 text-sm text-muted">{SALON.name} is a demo salon: nothing is sent anywhere.</p>
          <button className="btn btn-solid mt-6 w-full" disabled={!booking.time || !booking.name} onClick={() => go("done")}>
            Confirm booking, {pkr(total)}
          </button>
        </section>
      )}

      {stage === "done" && (
        <section className="rise mx-auto max-w-xl py-10 text-center">
          <div className="label text-accent">Booked (demo)</div>
          <h2 data-step-title tabIndex={-1} className="mt-3 text-4xl font-medium tracking-tight outline-none">See you soon, {booking.name.split(" ")[0]}.</h2>
          <p className="mt-3 text-muted">
            {new Date(Date.now() + (booking.day + 1) * 86400000).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })} at {booking.time}. Your stylist gets your photos, YouCam&apos;s readings and this plan before you arrive, so the consultation is already done.
          </p>
          {after && <img src={after} alt="Your look" className="mx-auto mt-8 aspect-[4/5] w-56 object-cover" />}
          <button className="btn btn-line mt-8" onClick={() => location.reload()}>
            Start over
          </button>
        </section>
      )}
    </div>
  );
}

// YouCam error codes, in words a customer can act on.
const ERRORS: Record<string, string> = {
  error_face_angle_invalid: "one of the photos wasn't at the angle the AI needs. Retake with your chin level (or turned about 45° for the side shots).",
  error_face_position_too_small: "your face was too small in the frame. Fill the oval.",
  error_face_position_out_of_boundary: "your face was cut off at the edge. Keep it inside the oval.",
  error_face_not_forward_facing: "the front photo wasn't facing the camera straight on.",
  error_no_face: "the AI couldn't find a face in that photo.",
  error_lighting_dark: "the photo was too dark. Face a window.",
  error_mismatch_image_size: "the three angle photos weren't the same size.",
};
const friendly = (m: string) => ERRORS[m] ?? m.replaceAll("_", " ");

const SHAPES: Record<string, string> = { InvTriangle: "Inverted triangle", Oblong: "Long (oblong)" };
const shapeName = (s: string) => SHAPES[s] ?? s;

function Card({ title, missing, wide, children }: { title: string; missing?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-paper p-5 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="label">{title}</span>
        {!missing && <Source kind="youcam" />}
      </div>
      <div className="mt-3">{missing ? <p className="text-sm text-muted">Not measured: {friendly(missing)}</p> : children}</div>
    </div>
  );
}

function LookCard({ t, p, img, onPick, tag }: { t: Template; p: Plan; img?: string; onPick: () => void; tag?: string }) {
  return (
    <button onClick={onPick} className="group text-left">
      <div className="relative overflow-hidden bg-tile">
        <img src={img ?? t.thumb} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        {img && <span className="label absolute left-2 top-2 bg-paper px-2 py-1 text-[11px]">On you</span>}
        {tag && <span className="label absolute bottom-2 left-2 bg-ink px-2 py-1 text-[11px] text-paper">{tag}</span>}
      </div>
      <div className="mt-2 font-medium">{t.title}</div>
      <div className={`text-sm ${p.feasible ? "text-muted" : "text-warn"}`}>{effortLabel(p)}</div>
    </button>
  );
}

// A service the customer has answered: one clear line, with a way to change it.
function DecidedRow({ n, name, price, added, onChange }: { n: number; name: string; price: number; added: boolean; onChange: () => void }) {
  return (
    <li className={`flex items-center gap-3 border px-4 py-3 ${added ? "border-ink" : "border-line text-muted"}`}>
      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${added ? "bg-accent text-paper" : "border border-line"}`}>
        {added ? "✓" : "–"}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`leading-snug ${added ? "font-medium" : "line-through"}`}>
          <span className="sr-only">{n}. </span>
          {name}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
          <span className={added ? "text-accent" : ""}>{added ? "In your plan" : "Skipped"}</span>
          <span className={`tabular-nums ${added ? "text-muted" : "line-through"}`}>{pkr(price)}</span>
        </div>
      </div>
      <button className="label min-h-11 px-2 underline underline-offset-4" onClick={onChange} aria-label={`Change ${name}`}>
        Change
      </button>
    </li>
  );
}

function PlanSummary({ items, skipped = 0, title = "Your plan so far", big, className = "" }: { items: { id: string; name: string; price: number }[]; skipped?: number; title?: string; big?: boolean; className?: string }) {
  const sum = items.reduce((s, x) => s + x.price, 0);
  return (
    <div className={className}>
      <div className="label mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="border-y border-line py-3 text-muted">Nothing added yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((s) => (
            <li key={s.id} className="flex justify-between gap-4 py-2.5">
              <span>{s.name}</span>
              <span className="tabular-nums">{pkr(s.price)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-baseline justify-between">
        <span className="label">Total{skipped ? `, ${skipped} skipped` : ""}</span>
        <span className={`${big ? "text-3xl" : "text-xl"} font-medium tabular-nums`}>{pkr(sum)}</span>
      </div>
    </div>
  );
}

function Limits() {
  return (
    <details className="mt-6 border border-line p-5">
      <summary className="label cursor-pointer py-1">What a photo can&apos;t tell you</summary>
      <ul className="mt-3 list-inside list-disc space-y-1 text-muted">
        <li>The back of your head, your crown and cowlicks. Your stylist checks those in person.</li>
        <li>Hair loss. A density reading from a photo is a hint, not a diagnosis. See a dermatologist if you&apos;re shedding.</li>
        <li>Past chemical treatments. Tell your stylist about any colour, perm or keratin in the last year.</li>
        <li>Lighting changes skin scores. Daylight, facing a window, works best.</li>
        <li>Face shape guidance is a stylist&apos;s rule of thumb. Wear what you like.</li>
      </ul>
    </details>
  );
}

function Tracker({ current, reached, locked, onGo, onBack }: { current: number; reached: number; locked: number[]; onGo: (i: number) => void; onBack?: () => void }) {
  return (
    <div className="mb-5 border-b border-line pb-3 sm:mb-10 sm:pb-5">
      <div className="flex items-center justify-between gap-4">
        <button className="label -ml-2 flex min-h-11 items-center gap-2 px-2 disabled:opacity-30" onClick={onBack} disabled={!onBack}>
          <span aria-hidden>←</span> Back
        </button>
        <div className="label text-muted sm:hidden">
          Step {current + 1} of {TRACK.length}: {TRACK[current].label}
        </div>
      </div>
      <nav aria-label="Consultation steps" className="mt-2">
        <ol className="flex gap-1 sm:gap-2">
          {TRACK.map((t, i) => {
            const can = i !== current && i <= reached && !locked.includes(i);
            const state = i < current ? "done" : i === current ? "now" : "next";
            return (
              <li key={t.stage} className="min-w-0 flex-1">
                <button
                  disabled={!can}
                  onClick={() => onGo(i)}
                  aria-current={i === current ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${t.label}${state === "done" ? ", done" : ""}`}
                  className={`group w-full py-1 text-left ${can ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`h-1 ${state === "next" ? "bg-line" : "bg-ink"} ${can ? "group-hover:bg-muted" : ""}`} />
                  <div className={`label mt-2 hidden truncate sm:block ${state === "now" ? "text-ink" : state === "done" ? "text-ink/70" : "text-muted"}`}>
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> {t.label}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
