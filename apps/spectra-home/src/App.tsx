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
        <nav className="sticky top-0 z-20 border-b border-white/20 bg-background/60 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
            <a className="text-sm font-medium tracking-tight" href="#hero">
              Spectra
            </a>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 md:pt-28" id="hero">
          <p className="mb-4 text-sm font-medium text-primary">Developer design tool</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Show Don&apos;t Tell
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Design interactions in code and ship polished previews in minutes. Spectra helps product
            engineers present motion, states, and intent without slowing down delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Start building</Button>
            <Button size="lg" variant="secondary">
              Watch demo
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24" id="demo">
          <div className="mb-6 flex items-end justify-between gap-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Demo</h2>
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

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-16 md:grid-cols-3 md:py-24" id="features">
          <h2 className="md:col-span-3 mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Features</h2>
          <article className="rounded-2xl border border-white/25 bg-card/70 p-6">
            <h3 className="text-lg font-medium">Live interaction canvas</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Prototype directly in the browser with smooth, code-first interaction tuning.
            </p>
          </article>
          <article className="rounded-2xl border border-white/25 bg-card/70 p-6">
            <h3 className="text-lg font-medium">Design-to-dev alignment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep implementation and presentation in sync with reusable interaction primitives.
            </p>
          </article>
          <article className="rounded-2xl border border-white/25 bg-card/70 p-6">
            <h3 className="text-lg font-medium">Fast iteration loops</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore visual states quickly and share production-like previews with your team.
            </p>
          </article>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24" id="pricing">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/25 bg-card/70 p-6">
              <p className="text-sm text-muted-foreground">Starter</p>
              <p className="mt-2 text-3xl font-semibold">$0</p>
              <p className="mt-2 text-sm text-muted-foreground">Perfect for solo exploration and demos.</p>
              <Button className="mt-6 w-full" variant="secondary">
                Get started
              </Button>
            </article>
            <article className="rounded-2xl border border-primary/35 bg-card/80 p-6">
              <p className="text-sm text-muted-foreground">Pro</p>
              <p className="mt-2 text-3xl font-semibold">$24</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Team-ready collaboration, exports, and advanced interaction controls.
              </p>
              <Button className="mt-6 w-full">Choose Pro</Button>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-24 pt-16 md:pb-32 md:pt-24" id="faq">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">FAQ</h2>
          <div className="space-y-3">
            <article className="rounded-2xl border border-white/25 bg-card/70 p-5">
              <h3 className="text-sm font-medium sm:text-base">Can I use Spectra with my existing stack?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. Spectra is designed for developer workflows and can fit into existing frontend toolchains.
              </p>
            </article>
            <article className="rounded-2xl border border-white/25 bg-card/70 p-5">
              <h3 className="text-sm font-medium sm:text-base">Does the demo output match production behavior?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                The goal is parity-first previews so teams can align earlier and ship with fewer visual surprises.
              </p>
            </article>
            <article className="rounded-2xl border border-white/25 bg-card/70 p-5">
              <h3 className="text-sm font-medium sm:text-base">Is there a free tier for testing?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes, the starter tier is available for individual developers to try the product.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
