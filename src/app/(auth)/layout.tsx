import Link from "next/link";

/** Groupe « auth » : plein écran centré, sans sidebar/header (mode focus). */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M7 21h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Zm14 0-2.5 6a3 3 0 0 0 5 0L19 7Z" />
            </svg>
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">
            Jurist<span className="text-primary"> BF</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
