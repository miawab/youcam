import Link from "next/link";

export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="6" width="28" height="28" transform="rotate(45 20 20)" />
      <path d="M14 26c2-7 10-7 12 0M15 15h10" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <>
    <a href="#content" className="skip-link label">Skip to content</a>
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto grid h-[72px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5">
        <nav className="label hidden gap-7 md:flex">
          <Link href="/#how">How it works</Link>
          <Link href="/#solves">What it solves</Link>
          <Link href="/#salons">For salons</Link>
        </nav>
        <Link href="/" className="col-start-2 flex flex-col items-center gap-0.5">
          <Mark />
          <span className="label tracking-[0.22em]">Chairside</span>
        </Link>
        <div className="label col-start-3 flex items-center justify-end gap-7">
          <Link href="/salon" className="hidden md:block">
            Demo salon
          </Link>
          <Link href="/consult" className="border-b border-ink pb-0.5">
            Start consultation
          </Link>
        </div>
      </div>
    </header>
    <div id="content" tabIndex={-1} />
    </>
  );
}
