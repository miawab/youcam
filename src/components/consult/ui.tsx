"use client";

import { useRef, useState } from "react";

export function Source({ kind }: { kind: "youcam" | "rule" }) {
  return kind === "youcam" ? <span className="chip chip-yc">Measured by YouCam</span> : <span className="chip chip-rule">Salon rule</span>;
}

export function StepHead({ n, total, title, sub }: { n: number; total: number; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <div className="label text-muted">
        Step {n} of {total}
      </div>
      <h2 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-2 max-w-xl text-muted">{sub}</p>}
    </div>
  );
}

export function Meter({ value, max = 100, tone = "ink" }: { value: number; max?: number; tone?: "ink" | "accent" }) {
  return (
    <div className="h-1.5 w-full bg-line">
      <div className={tone === "ink" ? "h-full bg-ink" : "h-full bg-accent"} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
    </div>
  );
}

// Drag the handle to compare before/after.
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
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="pulse inline-block h-2 w-2 bg-ink" />
      {text}
    </div>
  );
}
