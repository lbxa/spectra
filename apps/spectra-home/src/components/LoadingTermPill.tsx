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
        className="h-auto gap-2 border-sky-200 bg-sky-50/80 px-3.5 py-1.5 tracking-wide text-sky-700 shadow-sm backdrop-blur-sm"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
        <span
          className="inline-block transition-opacity duration-250 ease-out font-mono"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {terms[index]}…
        </span>
      </Badge>
    </div>
  )
}
