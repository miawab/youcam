import Link from "next/link";

export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="6" width="28" height="28" transform="rotate(45 20 20)" />
      <path d="M14 26c2-7 10-7 12 0M15 15h10" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <nav className="label hidden gap-6 sm:flex">
          <Link href="/#how">How it works</Link>
          <Link href="/#salons">For salons</Link>
          <Link href="/salon">Demo salon</Link>
        </nav>
        <Link href="/" className="flex flex-col items-center gap-0.5">
          <Mark />
          <span className="label text-[10px] tracking-[0.2em]">Chairside</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/consult" className="label">
            Start consultation
          </Link>
        </div>
      </div>
    </header>
  );
}
