"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import templatesJson from "@/data/templates.json";
import Framer from "@/components/Framer";
import { SALON, SERVICES, pkr } from "@/lib/catalog";
import { LENGTH_NAMES, SKIN_BENEFITS, SKIN_LABEL, SKIN_SERVICE, effortLabel, planFor, skinPicks } from "@/lib/route";
import { SAMPLE } from "@/lib/sample";
import type { Analysis, Plan, SkinConcern, Template } from "@/lib/types";
import { Compare, Meter, Source, Spinner, StepHead, Toggle } from "./ui";

const TEMPLATES = templatesJson as Template[];
type Slot = "front" | "right" | "left" | "down";
const SLOTS: { id: Slot; title: string; hint: string; optional?: boolean }[] = [
  { id: "front", title: "Straight on", hint: "Look straight ahead, hair down" },
  { id: "right", title: "Turn to your right", hint: "Turn your head about 45° to your right" },
  { id: "left", title: "Turn to your left", hint: "Turn your head about 45° to your left" },
  { id: "down", title: "Chin down", hint: "Tilt your head down so your hairline shows", optional: true },
];
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
  const [slot, setSlot] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<"f" | "m">("f");
  const [look, setLook] = useState<Template | null>(null);
  const [tryons, setTryons] = useState<Record<string, string>>({});
  const [tryonBusy, setTryonBusy] = useState(false);
  const [revealed, setRevealed] = useState(1);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [skinPicked, setSkinPicked] = useState<Record<string, boolean>>({});
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

  function startSample() {
    setMode("sample");
    setPhotos({ front: { url: SAMPLE.photos.front }, right: { url: SAMPLE.photos.right }, left: { url: SAMPLE.photos.left } });
    setAnalysis(SAMPLE.analysis);
    setTryons(SAMPLE.tryons);
    setGroup("f");
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
      setAnalysis(d);
      go("report", true);
    } catch (e) {
      setError((e as Error).message);
      go("photos", true);
    }
  }

  async function chooseLook(t: Template) {
    setLook(t);
    setRevealed(1);
    setPicked({});
    setAfter(null);
    go("plan");
    if (tryons[t.id] || mode !== "live" || !analysis?.frontFileId) return;
    setTryonBusy(true);
    try {
      const r = await fetch("/api/tryon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: analysis.frontFileId, templateId: t.id }) });
      const d = await r.json();
      if (d.url) setTryons((m) => ({ ...m, [t.id]: d.url }));
    } finally {
      setTryonBusy(false);
    }
  }

  const steps = plan?.steps ?? [];
  const isOn = (svc: string, required: boolean) => picked[svc] ?? required;
  const chosenHair = steps.filter((s) => isOn(s.service, s.required));
  const chosenSkin = skinList.filter(([c]) => skinPicked[c]);
  const cart = [...chosenHair.map((s) => SERVICES[s.service]), ...chosenSkin.map(([c]) => SERVICES[SKIN_SERVICE[c]])];
  const total = cart.reduce((s, x) => s + x.price, 0);
  const minutes = cart.reduce((s, x) => s + x.minutes, 0);
  const tryonUrl = look ? tryons[look.id] : undefined;

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
      const r = await fetch("/api/after", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: tryonUrl, concerns: chosenSkin.map(([c]) => c) }) });
      const d = await r.json();
      setAfter(d.url ?? tryonUrl);
      setSkinSimulated(!!d.url);
    } finally {
      setAfterBusy(false);
    }
  }

  const front = photos.front?.url;

  return (
    <div className={embedded ? "px-5 py-8" : "mx-auto max-w-5xl px-5 py-10 sm:py-14"}>
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
              Four photos. YouCam AI reads your hair texture, frizz, length and skin, shows you any look on your own face, then lays out every service it takes to get there, with prices and timing.
            </p>
            <ul className="mt-6 space-y-2">
              <li>2 minutes. Nothing is booked until you confirm.</li>
              <li>We tell you when a look isn&apos;t possible, and when a treatment won&apos;t help.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-solid" disabled={mode !== "live"} onClick={() => go("photos")}>
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
        <section className="rise grid gap-10 md:grid-cols-[1fr_380px]">
          <div>
            <StepHead title={SLOTS[slot].title} sub="Three angles let YouCam read your curl pattern and frizz. The chin-down photo lets it look at your hairline." />
            <div className="flex gap-2">
              {SLOTS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSlot(i)}
                  className="text-left"
                  aria-current={i === slot ? "step" : undefined}
                  aria-label={`Photo ${i + 1}: ${s.title}, ${photos[s.id] ? "taken" : s.optional ? "optional" : "needed"}`}
                >
                  <div className={`relative aspect-[4/5] w-20 overflow-hidden bg-tile ${i === slot ? "border-2 border-ink" : "border border-line"}`}>
                    {photos[s.id] ? <img src={photos[s.id]!.url} alt="" className="h-full w-full object-cover" /> : <span className="label absolute inset-0 flex items-center justify-center text-muted">{i + 1}</span>}
                  </div>
                  <div className="label mt-1 text-muted">{s.optional ? "Optional" : photos[s.id] ? "Done" : "Needed"}</div>
                </button>
              ))}
            </div>
            <ul className="mt-8 space-y-3 border-t border-line pt-6">
              <li><span className="label mr-2">Light</span>Face a window. Dark photos lower skin scores.</li>
              <li><span className="label mr-2">Hair</span>Down and untied, the way you usually wear it.</li>
              <li><span className="label mr-2">Frame</span>Fill the oval. Keep your head level unless asked to turn.</li>
              <li><span className="label mr-2">Privacy</span>Photos go to YouCam for analysis. We don&apos;t store them; YouCam keeps results for 24 hours.</li>
            </ul>
            {error && <p role="alert" className="mt-6 border border-warn p-3 text-warn">{error}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-solid" disabled={!photos.front || !photos.right || !photos.left} onClick={analyse}>
                Read my hair &amp; skin
              </button>
              {SLOTS[slot].optional && !photos[SLOTS[slot].id] && photos.front && photos.right && photos.left && (
                <button className="btn btn-line" onClick={analyse}>
                  Skip chin-down
                </button>
              )}
            </div>
          </div>
          <Framer
            key={SLOTS[slot].id}
            guide={SLOTS[slot].id}
            hint={SLOTS[slot].hint}
            onCapture={(blob) => {
              setPhotos((p) => ({ ...p, [SLOTS[slot].id]: { blob, url: URL.createObjectURL(blob) } }));
              if (slot < SLOTS.length - 1) setSlot(slot + 1);
            }}
          />
        </section>
      )}

      {stage === "reading" && (
        <section className="rise mx-auto max-w-md py-16">
          <StepHead title="Reading your photos" />
          <div className="space-y-4" role="status" aria-live="polite">
            {["Hair type from 3 angles", "Frizz", "Length", "Hairline density", "Skin: breakouts, texture, under-eyes, radiance"].map((t, i) => (
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
          <StepHead title="Here's what we see" sub="Every number below comes from a YouCam AI model, not from us." />
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {front && <img src={front} alt="Your photo" className="aspect-[4/5] w-36 object-cover lg:w-full" />}
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
              <Card title="Hairline density" missing={analysis.missing.density}>
                {analysis.hair.density && (
                  <>
                    <div className="text-2xl font-medium">{analysis.hair.density.term}</div>
                    <div className="text-sm text-muted">A rough read from one photo. Not a diagnosis.</div>
                  </>
                )}
              </Card>
              <div className="bg-paper p-5 sm:col-span-2">
                <div className="flex items-center justify-between">
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
            </div>
          </div>
          <Limits />
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            {mode === "live" && (analysis.missing.type || analysis.missing.length || analysis.missing.skin) && (
              <button className="btn btn-line" onClick={() => { setSlot(0); go("photos"); }}>
                Retake photos
              </button>
            )}
            <button className="btn btn-solid" onClick={() => go("looks")}>
              Choose a look
            </button>
          </div>
        </section>
      )}

      {stage === "looks" && analysis && (
        <section className="rise">
          <StepHead title="Pick a look" sub="Under each look: what it takes to get there from your hair today." />
          <div className="mb-6 flex gap-2">
            {(["f", "m"] as const).map((g) => (
              <button key={g} aria-pressed={group === g} className={`btn ${group === g ? "btn-solid" : "btn-line"}`} onClick={() => setGroup(g)}>
                {g === "f" ? "Women" : "Men"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {TEMPLATES.filter((t) => t.group === group).map((t) => {
              const p = planFor(analysis, t);
              const ready = !!tryons[t.id];
              return (
                <button key={t.id} onClick={() => chooseLook(t)} className="group text-left">
                  <div className="relative overflow-hidden bg-tile">
                    <img src={ready ? tryons[t.id] : t.thumb} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    {ready && <span className="label absolute left-2 top-2 bg-paper px-2 py-1">On you</span>}
                  </div>
                  <div className="mt-2 font-medium">{t.title}</div>
                  <div className={`text-sm ${p.feasible ? "text-muted" : "text-warn"}`}>{effortLabel(p)}</div>
                </button>
              );
            })}
          </div>
          {mode === "sample" && <p className="mt-6 text-sm text-muted">Sample mode: three looks have saved YouCam try-ons. Every look still gets a full plan.</p>}
        </section>
      )}

      {stage === "plan" && analysis && look && plan && (
        <section className="rise">
          <StepHead title={look.title} sub="Recommendations come one at a time. Add what you want, skip what you don't." />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
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
              {look.colorChange && <p className="mt-2 text-sm text-muted">This look changes hair colour too, so the colour service is part of the plan.</p>}
            </div>
            <div>
              {!plan.feasible && <div className="mb-4 border border-warn p-4 text-sm text-warn">Heads up: this look isn&apos;t fully possible from your hair. Details below.</div>}
              <ol className="space-y-3" aria-live="polite">
                {steps.slice(0, revealed).map((s, i) => {
                  const svc = SERVICES[s.service];
                  const on = isOn(s.service, s.required);
                  return (
                    <li key={s.service} className={`rise border p-5 ${on ? "border-ink" : "border-line"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="label text-muted">
                            {i + 1}. {s.required ? "Needed for this look" : "Recommended"}
                            {plan.visits.length > 1 ? `, visit ${s.visit}` : ""}
                          </div>
                          <div className="mt-1 text-lg font-medium">{svc.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="tabular-nums">{pkr(svc.price)}</div>
                          <div className="text-xs text-muted">{svc.minutes} min</div>
                        </div>
                      </div>
                      <p className="mt-2">{s.why}</p>
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
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <Source kind={s.source} />
                        <Toggle name={svc.name} on={on} set={(v) => setPicked((p) => ({ ...p, [s.service]: v }))} />
                      </div>
                      {s.required && !on && <p className="mt-2 text-sm text-warn">Without this, you won&apos;t get the look in the preview.</p>}
                    </li>
                  );
                })}
              </ol>
              {revealed < steps.length ? (
                <button className="btn btn-line mt-4 w-full" onClick={() => setRevealed(revealed + 1)}>
                  Next recommendation ({steps.length - revealed} left)
                </button>
              ) : (
                <>
                  {(plan.notes.length > 0 || plan.growMonths) && (
                    <div className="rise mt-6 border-t border-line pt-4">
                      <div className="label mb-2">Straight talk</div>
                      <ul className="space-y-2">
                        {plan.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rise mt-6 flex items-center justify-between border-t border-line pt-4">
                    <div>
                      <div className="label text-muted">Hair so far</div>
                      <div className="text-2xl font-medium tabular-nums">{pkr(chosenHair.reduce((s, x) => s + SERVICES[x.service].price, 0))}</div>
                      <div className="text-xs text-muted">{plan.visits.map((v) => v.when).join(", then ")}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-line" onClick={() => go("looks")}>
                        Other looks
                      </button>
                      <button className="btn btn-solid" onClick={() => go("skin")}>
                        Next: skin
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {stage === "skin" && analysis && (
        <section className="rise">
          <StepHead title="And your skin" sub="From the same front photo. We only suggest a facial where YouCam scored you below 85." />
          {skinList.length === 0 ? (
            <div className="border border-line p-6">
              <div className="text-xl font-medium">{analysis.skin ? "Your skin scored well. No facial needed." : "We couldn't read your skin this time."}</div>
              <p className="mt-2 text-sm text-muted">{analysis.skin ? "We'd rather tell you that than sell you one." : analysis.missing.skin}</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {skinList.map(([c, score]) => {
                const svc = SERVICES[SKIN_SERVICE[c]];
                const on = !!skinPicked[c];
                return (
                  <div key={c} className={`rise border p-5 ${on ? "border-ink" : "border-line"}`}>
                    <div className="flex justify-between">
                      <span className="label text-muted">{SKIN_LABEL[c]}</span>
                      <span className="text-sm tabular-nums">{score}/100</span>
                    </div>
                    <div className="mt-2">
                      <Meter value={score} />
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="text-lg font-medium">{svc.name}</div>
                      <div className="tabular-nums">{pkr(svc.price)}</div>
                    </div>
                    <ul className="mt-2 list-inside list-disc">
                      {SKIN_BENEFITS[c].map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-between">
                      <Source kind="youcam" />
                      <Toggle name={svc.name} on={on} set={(v) => setSkinPicked((p) => ({ ...p, [c]: v }))} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <button className="btn btn-solid" onClick={makeAfter}>
              See me after everything
            </button>
          </div>
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
            <div>
              {afterBusy ? (
                <div className="flex aspect-[4/5] items-center justify-center bg-tile">
                  <Spinner text="YouCam is simulating your skin after treatment" />
                </div>
              ) : after && front ? (
                <Compare before={front} after={after} labels={["Today", "After"]} />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-tile p-6 text-center text-sm text-muted">The full preview needs live mode for this look. Your plan below is still complete.</div>
              )}
              <p className="mt-2 text-sm text-muted">A preview, not a promise. Real results depend on your hair and your stylist.</p>
            </div>
            <div>
              <div className="label mb-3">Your plan at {SALON.name}</div>
              <ul className="divide-y divide-line border-y border-line">
                {cart.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 py-3">
                    <span>{s.name}</span>
                    <span className="tabular-nums">{pkr(s.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="label">Total</span>
                <span className="text-3xl font-medium tabular-nums">{pkr(total)}</span>
              </div>
              <div className="mt-1 text-right text-sm text-muted">
                About {Math.round(minutes / 60)} h in the chair{plan && plan.visits.length > 1 ? " over 2 visits" : ""}. {SALON.note}
              </div>
              <div className="mt-8 flex flex-wrap justify-end gap-2">
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
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="time-label">
            {["11:00", "13:00", "15:30", "18:00"].map((t) => (
              <button key={t} aria-pressed={booking.time === t} className={`btn ${booking.time === t ? "btn-solid" : "btn-line"} min-h-10`} onClick={() => setBooking({ ...booking, time: t })}>
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
  error_face_angle_invalid: "one of the photos wasn't at the angle the AI needs. Retake with your head level (or turned about 45° for the side shots).",
  error_face_position_too_small: "your face was too small in the frame. Fill the oval.",
  error_face_position_out_of_boundary: "your face was cut off at the edge. Keep it inside the oval.",
  error_no_face: "the AI couldn't find a face in that photo.",
  error_lighting_dark: "the photo was too dark. Face a window.",
  error_mismatch_image_size: "the three angle photos weren't the same size.",
};
const friendly = (m: string) => ERRORS[m] ?? m.replaceAll("_", " ");

function Card({ title, missing, children }: { title: string; missing?: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper p-5">
      <div className="flex items-center justify-between">
        <span className="label">{title}</span>
        {!missing && <Source kind="youcam" />}
      </div>
      <div className="mt-3">{missing ? <p className="text-sm text-muted">Not measured: {friendly(missing)}</p> : children}</div>
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
      </ul>
    </details>
  );
}

function Tracker({ current, reached, locked, onGo, onBack }: { current: number; reached: number; locked: number[]; onGo: (i: number) => void; onBack?: () => void }) {
  return (
    <div className="mb-10 border-b border-line pb-5">
      <div className="flex items-center justify-between gap-4">
        <button className="label flex min-h-11 items-center gap-2 disabled:opacity-30" onClick={onBack} disabled={!onBack}>
          <span aria-hidden>←</span> Back
        </button>
        <div className="label text-muted sm:hidden">
          Step {current + 1} of {TRACK.length}: {TRACK[current].label}
        </div>
      </div>
      <nav aria-label="Consultation steps" className="mt-3">
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
