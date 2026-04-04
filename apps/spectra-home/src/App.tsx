import { LoadingTermPill } from "@/components/LoadingTermPill"
import { ArrowUpRight } from "lucide-react"
import { MiniOrb } from "@spectra/orb"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import chromeLogo from "@/assets/chrome.svg"

function App() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-transparent text-foreground">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <div className="opacity-90">
            <MiniOrb sizePx={360} className="block sm:hidden" />
            <MiniOrb sizePx={560} className="hidden sm:block md:hidden" />
            <MiniOrb sizePx={660} className="hidden md:block lg:hidden" />
            <MiniOrb sizePx={800} className="hidden lg:block" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
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
          <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-3 delay-300">
            <div className="magic-btn">
              <div className="magic-btn-ray" aria-hidden="true" />
              <Button size="lg" className="relative z-10 cursor-pointer">
                <span className="inline-flex items-center gap-2">
                  <img src={chromeLogo} alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Start building
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </span>
              </Button>
            </div>
            <Button size="lg" variant="outline" className="cursor-pointer">
              Watch demo
            </Button>
          </div>
          {/* <button
            type="button"
            className="animate-fade-up mt-4 inline-block cursor-pointer rounded-lg transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Available in the Chrome Web Store"
          >
            <img
              src={chromeWebStoreButton}
              alt="Available in the Chrome Web Store"
              className="h-auto w-[200px] max-w-full"
            />
          </button> */}
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
            <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-linear-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20">
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
            <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-linear-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20">
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
            <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-muted-foreground/30">
              <div className="aspect-[4/3] w-full bg-linear-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20">
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
          <div className="rounded-2xl bg-white px-6">
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
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                What is Spectra and who is it for?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Spectra is an interaction-design tool built for product engineers and frontend developers. It lets you prototype motion, states, and interactive behavior directly in code and share production-fidelity previews with your team — without switching to a separate design tool.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                How is Spectra different from Figma or Storybook?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Figma is great for static visual design and Storybook excels at component documentation, but neither captures real interaction behavior. Spectra focuses on the gap between them: prototyping animations, transitions, and stateful flows in actual code so what you preview is what you ship.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                What frameworks and libraries does Spectra support?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Spectra works with modern frontend stacks including React, Next.js, Vue, Svelte, and vanilla HTML/CSS/JS. It integrates into your existing toolchain through a lightweight browser extension and does not require you to adopt a new framework.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Do I need design skills to use Spectra?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                No. Spectra is built for engineers, not designers. If you can write frontend code, you can use Spectra to capture, tune, and share interactive previews without any design tool experience.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Can I share previews with non-technical stakeholders?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Yes. Spectra previews are shareable links that render in any modern browser. Product managers, designers, and clients can review interactive behavior without installing anything or reading code.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                What kind of interactions can I prototype with Spectra?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Anything you can build in the browser: hover states, page transitions, scroll-driven animations, drag interactions, loading sequences, multi-step flows, and responsive layout behavior. Spectra captures the real DOM so the preview matches what users will see.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                How long does it take to get started?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Most teams are capturing their first preview within minutes. Install the browser extension, open your app in development, and start selecting the interactions you want to share. There is no project configuration or build step required.
              </p>
            </details>
            <details className="group border-b border-border">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Can Spectra replace my current prototyping tool?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                Spectra is designed to complement your workflow, not replace everything. It is ideal when you need to show how something works — animations, transitions, interactive states — rather than how it looks statically. Many teams use Spectra alongside Figma or Sketch.
              </p>
            </details>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-base font-medium transition-colors hover:text-primary">
                Is Spectra open source?
                <span className="faq-icon ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-muted-foreground">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                The core capture engine and browser extension are source-available. The collaboration and team features in the Pro tier are proprietary. Check the repository for the current license terms.
              </p>
            </details>
          </div>
        </section>

        <footer className="border-t border-border bg-black text-neutral-200">
          <div className="mx-auto w-full max-w-6xl px-6 py-12 text-center sm:py-16 md:py-20">
            <blockquote className="font-display text-[clamp(3rem,10vw,10rem)] leading-none tracking-tight text-neutral-200">
              Show Don&apos;t <i>Tell</i>
            </blockquote>
          </div>
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4">
            <p className="text-[0.55rem] text-neutral-200 md:text-[0.65rem]">
              <span className="block md:inline">&copy; {new Date().getFullYear()} Spectra.</span>
              <span className="block md:ml-1 md:inline">All rights reserved.</span>
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 justify-self-center cursor-pointer"
              aria-label="Scroll to top"
            >
              <MiniOrb sizePx={32} className="shrink-0" />
              <span className="text-xl font-sans font-semibold tracking-tighter text-neutral-200 select-none">
                Spectra
              </span>
            </button>
            <div className="flex items-center justify-end gap-4">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-neutral-200 transition-colors hover:text-white"
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
                className="text-neutral-200 transition-colors hover:text-white"
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
