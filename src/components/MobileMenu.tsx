"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Full-screen menu below the lg breakpoint.
export default function MobileMenu({ links }: { links: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        className="label -ml-2 flex min-h-11 items-center gap-2 px-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden className="relative block h-3 w-5">
          <span className={`absolute left-0 h-px w-5 bg-ink transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 h-px w-5 bg-ink transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
        </span>
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-paper px-5 py-6">
          <ul className="border-t border-line">
            {[...links, ["/consult", "Start a consultation"] as const].map(([href, t]) => (
              <li key={href} className="border-b border-line">
                <Link href={href} onClick={() => setOpen(false)} className="flex min-h-16 items-center justify-between text-2xl font-medium tracking-tight">
                  {t}
                  <span aria-hidden className="text-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
