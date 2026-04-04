import { createOrbScene, type OrbSceneTheme } from "@spectra/orb"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface OrbProps {
  className?: string
  theme?: Partial<OrbSceneTheme>
  particleCount?: number
}

export function Orb({ className, theme, particleCount }: OrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const scene = createOrbScene({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
      theme,
      particleCount
    })
    scene.start()
    const scrollRotationFactor = 0.0012
    const maxScrollRotation = Math.PI * 4
    const applyScrollRotation = () => {
      const rotationFromScroll = window.scrollY * scrollRotationFactor
      const nextRotation = Math.max(-maxScrollRotation, Math.min(maxScrollRotation, rotationFromScroll))
      scene.setScrollRotation(nextRotation)
    }
    applyScrollRotation()

    const triggerPulse = () => {
      scene.pulse()
    }

    container.addEventListener("pointerdown", triggerPulse)

    const handlePointerMove = (event: PointerEvent) => {
      const width = Math.max(1, window.innerWidth)
      const height = Math.max(1, window.innerHeight)
      const normalizedX = (event.clientX / width) * 2 - 1
      const normalizedY = 1 - (event.clientY / height) * 2
      scene.setPointer(normalizedX, normalizedY)
    }

    const handlePointerLeave = () => {
      scene.clearPointer()
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerdown", triggerPulse, { passive: true })
    window.addEventListener("pointerleave", handlePointerLeave)
    window.addEventListener("blur", handlePointerLeave)
    window.addEventListener("scroll", applyScrollRotation, { passive: true })

    const resize = () => {
      scene.resize(container.clientWidth, container.clientHeight)
    }

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize()
      })
      resizeObserver.observe(container)
    } else {
      window.addEventListener("resize", resize)
    }

    return () => {
      container.removeEventListener("pointerdown", triggerPulse)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerdown", triggerPulse)
      window.removeEventListener("pointerleave", handlePointerLeave)
      window.removeEventListener("blur", handlePointerLeave)
      window.removeEventListener("scroll", applyScrollRotation)
      resizeObserver?.disconnect()
      window.removeEventListener("resize", resize)
      scene.clearPointer()
      scene.dispose()
    }
  }, [particleCount, theme])

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-72 w-72 shrink-0 overflow-hidden rounded-full bg-transparent",
        className
      )}
    >
      <div className="absolute inset-0" ref={containerRef} />
      <div className="pointer-events-none absolute inset-0 rounded-full backdrop-blur-[2px]" />
    </div>
  )
}
