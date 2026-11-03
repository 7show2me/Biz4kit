import { BrandMark } from "@Biz4kit/ui/components/brand-mark";
import { buttonVariants } from "@Biz4kit/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: MarketingPage,
});

// The four core Quick jobs (D77). Section names only: the wording of the site comes
// from WBS 3.9 (Site & help) and the owner.
const QUICK_JOBS = ["Catalog", "Reply", "Invoice", "Cashflow"] as const;

function MarketingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <header className="h-header border-border tab:px-page flex items-center gap-3 border-b px-4">
        <span className="text-brand-ink">
          <BrandMark className="h-5" />
        </span>
        <nav aria-label="Site" className="ml-auto flex items-center gap-2">
          <Link className={buttonVariants({ variant: "outline" })} to="/login">
            Sign in
          </Link>
        </nav>
      </header>
      <main className="tab:px-page mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section aria-label="Introduction">
          <h1 className="text-heading font-serif font-semibold">Biz4Kit</h1>
          <p className="text-body text-muted-foreground mt-2">
            [Draft] Headline and pitch wait for WBS 3.9 (Site and help).
          </p>
        </section>
        <section
          aria-label="Quick jobs"
          className="tab:grid-cols-2 web:grid-cols-4 mt-8 grid gap-3"
        >
          {QUICK_JOBS.map((job) => (
            <div
              className="rounded-card border-border bg-card p-card border"
              key={job}
            >
              <h2 className="text-title font-semibold">Quick {job}</h2>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-border text-caption text-muted-foreground tab:px-page border-t px-4 py-4">
        Biz4Kit
      </footer>
    </div>
  );
}
