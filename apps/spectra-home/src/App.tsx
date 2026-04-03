import { LoadingTermPill } from "@/components/LoadingTermPill"
import { MiniOrb } from "@/components/MiniOrb"
import { Navbar } from "@/components/Navbar"
import { Orb } from "@/components/Orb"
import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <Orb
            className="h-96 w-96 opacity-90 sm:h-120 sm:w-120 md:h-160 md:w-160 lg:h-208 lg:w-208"
            particleCount={420}
            theme={{
              baseColor: "#0b6eea",
              highlightColor: "#7acbff",
              coreGlowColor: "#1a8cff",
              particleColor: "#8fd7ff"
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/70" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 md:pt-36" id="hero">
          <LoadingTermPill />
          <h1 className="animate-fade-up max-w-3xl font-display text-5xl leading-tight tracking-tight delay-100 md:text-7xl">
            Show Don&apos;t <em className="italic text-primary">Tell</em>
          </h1>
          <p className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground delay-200">
            Design interactions in code and ship polished previews in minutes. Spectra helps product
            engineers present motion, states, and intent without slowing down delivery.
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap gap-3 delay-300">
            <Button size="lg">Start building</Button>
            <Button size="lg" variant="secondary">
              Watch demo
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-24 md:py-28" id="demo">
          <div className="mb-6 flex items-end justify-between gap-6">
            <h2 className="font-display text-3xl tracking-tight md:text-5xl">Demo</h2>
          </div>
          <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-white/80 shadow-2xl">
            <div className="aspect-video w-full bg-linear-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20" />
            <div className="absolute inset-0 grid place-content-center text-sm text-muted-foreground">
              Product Recording Area
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-24 md:py-28" id="features">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Capabilities
          </p>
          <h2 className="mb-12 font-display text-3xl tracking-tight md:text-5xl">Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="overflow-hidden rounded-2xl border border-border bg-white/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-muted/40">
                <div className="grid h-full place-content-center text-xs text-muted-foreground">
                  Screenshot placeholder
                </div>
              </div>
              <div className="p-7 pt-5">
                <h3 className="text-lg font-semibold">Live interaction canvas</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Prototype directly in the browser with smooth, code-first interaction tuning.
                </p>
              </div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-border bg-white/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-muted/40">
                <div className="grid h-full place-content-center text-xs text-muted-foreground">
                  Screenshot placeholder
                </div>
              </div>
              <div className="p-7 pt-5">
                <h3 className="text-lg font-semibold">Design-to-dev alignment</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Keep implementation and presentation in sync with reusable interaction primitives.
                </p>
              </div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-border bg-white/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-muted/40">
                <div className="grid h-full place-content-center text-xs text-muted-foreground">
                  Screenshot placeholder
                </div>
              </div>
              <div className="p-7 pt-5">
                <h3 className="text-lg font-semibold">Fast iteration loops</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Explore visual states quickly and share production-like previews with your team.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-24 md:py-28" id="pricing">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mb-12 font-display text-3xl tracking-tight md:text-5xl">
            Get started with Spectra
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-border bg-white p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <p className="text-sm font-semibold">Starter</p>
              <p className="mt-3 font-display text-5xl">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">free forever</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                Perfect for solo exploration and demos.
              </p>
              <Button className="mt-8 w-full" variant="secondary">
                Get started
              </Button>
            </article>
            <article className="pro-card flex flex-col rounded-2xl p-7 text-white transition-all hover:-translate-y-0.5">
              <p className="relative z-10 text-sm font-semibold text-white/90">Pro</p>
              <p className="relative z-10 mt-3 font-display text-5xl">$24</p>
              <p className="relative z-10 mt-1 text-sm text-white/60">per month</p>
              <p className="relative z-10 mt-4 flex-1 text-sm leading-relaxed text-white/70">
                Team-ready collaboration, exports, and advanced interaction controls.
              </p>
              <Button className="relative z-10 mt-8 w-full bg-black text-white hover:bg-black/90">
                Choose Pro
              </Button>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 py-24 md:py-28" id="faq">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mb-12 font-display text-3xl tracking-tight md:text-5xl">
            Frequently asked questions
          </h2>
          <div>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Can I use Spectra with my existing stack?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Yes. Spectra is designed for developer workflows and can fit into existing frontend toolchains.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Does the demo output match production behavior?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                The goal is parity-first previews so teams can align earlier and ship with fewer visual surprises.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Is there a free tier for testing?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Yes, the starter tier is available for individual developers to try the product.
              </p>
            </details>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-8">
            <p className="text-[0.625rem] md:text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Spectra. All rights reserved.
            </p>
            <MiniOrb sizePx={32} className="justify-self-center" />
            <div className="flex items-center justify-end gap-4">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
