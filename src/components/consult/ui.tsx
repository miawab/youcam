"use client";

import { useRef, useState } from "react";

export function Source({ kind }: { kind: "youcam" | "rule" }) {
  return kind === "youcam" ? <span className="chip chip-yc">Measured by YouCam</span> : <span className="chip chip-rule">Salon rule</span>;
}

export function StepHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 data-step-title tabIndex={-1} className="text-3xl font-medium tracking-tight outline-none sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-3 max-w-xl text-lg text-muted">{sub}</p>}
    </div>
  );
}

// Add / Skip pair. aria-pressed tells screen readers which one is chosen.
export function Toggle({ name, on, set }: { name: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex gap-2" role="group" aria-label={name}>
      <button aria-pressed={on} className={`btn ${on ? "btn-solid" : "btn-line"} min-h-11 px-5`} onClick={() => set(true)}>
        {on ? "Added" : "Add"}
      </button>
      <button aria-pressed={!on} className={`btn ${!on ? "btn-solid" : "btn-line"} min-h-11 px-5`} onClick={() => set(false)}>
        {on ? "Skip" : "Skipped"}
      </button>
    </div>
  );
}

export function Meter({ value, max = 100, tone = "ink" }: { value: number; max?: number; tone?: "ink" | "accent" }) {
  return (
    <div className="h-1.5 w-full bg-line" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={tone === "ink" ? "h-full bg-ink" : "h-full bg-accent"} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
    </div>
  );
}

// Drag the handle (or use arrow keys) to compare before/after.
export function Compare({ before, after, labels = ["Now", "After"] }: { before: string; after: string; labels?: [string, string] }) {
  const [x, setX] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setX(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={box}
      className="relative aspect-[4/5] w-full cursor-ew-resize touch-none select-none overflow-hidden bg-tile"
      role="slider"
      tabIndex={0}
      aria-label={`Compare ${labels[0]} and ${labels[1]}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x)}
      aria-valuetext={`${Math.round(x)}% ${labels[0]}`}
      onKeyDown={(e) => {
        const step = e.key === "ArrowLeft" ? -5 : e.key === "ArrowRight" ? 5 : 0;
        if (step) {
          e.preventDefault();
          setX((v) => Math.min(100, Math.max(0, v + step)));
        }
      }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img src={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} draggable={false} />
      <div className="absolute inset-y-0 w-px bg-paper" style={{ left: `${x}%` }}>
        <div className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-paper" />
      </div>
      <span className="label absolute left-3 top-3 bg-paper px-2 py-1">{labels[0]}</span>
      <span className="label absolute right-3 top-3 bg-paper px-2 py-1">{labels[1]}</span>
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-muted" role="status">
      <span className="pulse inline-block h-2 w-2 bg-ink" />
      {text}
    </div>
  );
}
