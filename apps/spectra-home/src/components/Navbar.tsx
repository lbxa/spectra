import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"
import { MiniOrb } from "@spectra/orb"
import { cn } from "@/lib/utils"

const LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const openRef = useRef(false)
  const scrollToTop = () => {
    setIsOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    openRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    let prevY = window.scrollY
    let ticking = false

    const update = () => {
      const y = window.scrollY
      const delta = y - prevY
      const absDelta = Math.abs(delta)

      // Ignore mobile viewport jitter from browser chrome changes.
      if (absDelta < 8) {
        prevY = y
        ticking = false
        return
      }

      if (y < 100) {
        setVisible(true)
      } else if (delta > 0) {
        if (openRef.current) setIsOpen(false)
        setVisible(false)
      } else {
        setVisible(true)
      }

      prevY = y
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen])

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ transition: `opacity 300ms ${EASE}` }}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <nav
        className="fixed top-4 left-1/2 z-50"
        style={{
          translate: visible ? "-50% 0" : "-50% -120%",
          opacity: visible ? 1 : 0,
          transition: `translate 400ms ${EASE}, opacity 400ms ${EASE}`,
        }}
      >
        <div
          className={cn(
            "w-[calc(100vw-2rem)] rounded-2xl border-2 border-border/40 bg-white/60 backdrop-blur-2xl saturate-[1.8]"
          )}
          style={{
            maxWidth: isOpen ? "48rem" : "24rem",
            transition: `max-width 600ms ${EASE}`,
          }}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="shrink-0 cursor-pointer"
            >
              <MiniOrb sizePx={32} className="shrink-0" excited={isOpen} />
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="cursor-pointer text-2xl font-sans font-semibold tracking-tighter select-none"
            >
              Spectra
            </button>

            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              <Menu
                className="absolute size-5 text-foreground"
                style={{
                  transition: `opacity 300ms ${EASE}, transform 500ms ${EASE}`,
                  opacity: isOpen ? 0 : 1,
                  transform: isOpen ? "rotate(90deg)" : "rotate(0)",
                }}
              />
              <X
                className="absolute size-5 text-foreground"
                style={{
                  transition: `opacity 300ms ${EASE}, transform 500ms ${EASE}`,
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? "rotate(0)" : "rotate(-90deg)",
                }}
              />
            </button>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateRows: isOpen ? "1fr" : "0fr",
              transition: `grid-template-rows 600ms ${EASE}`,
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="px-6 pb-5"
                style={{
                  opacity: isOpen ? 1 : 0,
                  transition: isOpen
                    ? `opacity 400ms ${EASE} 150ms`
                    : `opacity 200ms ${EASE}`,
                }}
              >
                <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] pt-2">
                  <div className="flex flex-col gap-1.5">
                    {LINKS.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="cursor-pointer text-xl font-semibold tracking-tight transition-colors hover:text-muted-foreground"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>

                  <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-muted">
                    <div className="h-full w-full bg-linear-to-br from-blue-500/10 via-cyan-400/5 to-indigo-500/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-2 rounded-full bg-foreground/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                          aria-hidden="true"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Demo
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Show don&apos;t tell</span>
                  <span className="flex items-center justify-self-end gap-1.5">
                    Beta
                    <span className="size-1.5 rounded-full bg-sky-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
