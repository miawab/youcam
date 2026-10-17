import Link from "next/link";
import MobileMenu from "./MobileMenu";

export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="6" width="28" height="28" transform="rotate(45 20 20)" />
      <path d="M14 26c2-7 10-7 12 0M15 15h10" />
    </svg>
  );
}

const NAV = [
  ["/#how", "How it works"],
  ["/#solves", "What it solves"],
  ["/#salons", "For salons"],
  ["/salon", "Demo salon"],
] as const;

// Phones and tablets: menu | logo | start. Desktop: links | logo | links. The logo sits in the true centre either way.
export default function SiteHeader() {
  return (
    <>
      <a href="#content" className="skip-link label">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-5 lg:h-[72px]">
          <div className="flex items-center">
            <MobileMenu links={NAV} />
            <nav aria-label="Main" className="label hidden gap-7 lg:flex">
              {NAV.slice(0, 3).map(([href, t]) => (
                <Link key={href} href={href} className="hover:opacity-60">{t}</Link>
              ))}
            </nav>
          </div>
          <Link href="/" className="flex flex-col items-center gap-0.5" aria-label="Chairside home">
            <Mark className="h-6 w-6 lg:h-7 lg:w-7" />
            <span className="label text-[11px] tracking-[0.22em] lg:text-[13px]">Chairside</span>
          </Link>
          <div className="label flex items-center justify-end gap-7">
            <Link href="/salon" className="hidden hover:opacity-60 lg:block">Demo salon</Link>
            <Link href="/consult" className="border-b border-ink pb-0.5">
              <span className="lg:hidden">Start</span>
              <span className="hidden lg:inline">Start consultation</span>
            </Link>
          </div>
        </div>
      </header>
      <div id="content" tabIndex={-1} />
    </>
  );
}
