import { LoadingTermPill } from "@/components/LoadingTermPill"
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
        <div className="pointer-events-none absolute inset-0 bg-white/8 backdrop-blur-sm" />
      </div>

      <main className="relative z-10">
        <nav className="sticky top-0 z-20 border-b border-white/20 bg-background/60 backdrop-blur-xl saturate-150">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
            <a className="text-base font-semibold tracking-tight" href="#hero">
              Spectra
            </a>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a className="transition-colors hover:text-foreground" href="#demo">
                Demo
              </a>
              <a className="transition-colors hover:text-foreground" href="#features">
                Features
              </a>
              <a className="transition-colors hover:text-foreground" href="#pricing">
                Pricing
              </a>
              <a className="transition-colors hover:text-foreground" href="#faq">
                FAQ
              </a>
            </div>
          </div>
        </nav>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24 md:pt-32" id="hero">
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
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Full-width product walkthrough placeholder. Drop in your final screen recording when it
              is ready.
            </p>
          </div>
          <div className="relative w-full overflow-hidden rounded-3xl border border-white/25 bg-card/70 shadow-2xl">
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
            <article className="rounded-2xl border border-white/25 bg-card/70 p-7 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <h3 className="text-lg font-semibold">Live interaction canvas</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Prototype directly in the browser with smooth, code-first interaction tuning.
              </p>
            </article>
            <article className="rounded-2xl border border-white/25 bg-card/70 p-7 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <h3 className="text-lg font-semibold">Design-to-dev alignment</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Keep implementation and presentation in sync with reusable interaction primitives.
              </p>
            </article>
            <article className="rounded-2xl border border-white/25 bg-card/70 p-7 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <h3 className="text-lg font-semibold">Fast iteration loops</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Explore visual states quickly and share production-like previews with your team.
              </p>
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
            <article className="flex flex-col rounded-2xl border border-white/25 bg-card/70 p-7 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
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
            <article className="flex flex-col rounded-2xl border border-primary/35 bg-primary/5 p-7 transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <p className="text-sm font-semibold">Pro</p>
              <p className="mt-3 font-display text-5xl">$24</p>
              <p className="mt-1 text-sm text-muted-foreground">per month</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                Team-ready collaboration, exports, and advanced interaction controls.
              </p>
              <Button className="mt-8 w-full">Choose Pro</Button>
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
      </main>
    </div>
  )
}

export default App
