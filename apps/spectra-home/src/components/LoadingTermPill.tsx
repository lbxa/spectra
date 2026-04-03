import { useEffect, useState } from "react"
import { loadingTerms } from "@spectra/loading-terms"
import { Badge } from "@/components/ui/badge"

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function LoadingTermPill() {
  const [terms] = useState(() => shuffle(loadingTerms))
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % terms.length)
        setFading(false)
      }, 250)
    }, 2800)
    return () => clearInterval(id)
  }, [terms.length])

  return (
    <div className="animate-fade-up mb-5">
      <Badge
        variant="outline"
        className="h-auto gap-2 border-gray-500/25 bg-gray-500/10 px-3.5 py-1.5 tracking-wide text-[#7acbff] backdrop-blur-sm"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#0b6eea]" />
        <span
          className="inline-block transition-opacity duration-250 ease-out"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {terms[index]}…
        </span>
      </Badge>
    </div>
  )
}
