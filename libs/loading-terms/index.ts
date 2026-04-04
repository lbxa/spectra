import wordsByCategory from "./words.json"

type LoadingTermsByCategory = Record<string, string[]>

const groupedTerms = wordsByCategory as LoadingTermsByCategory

export const loadingTerms = Object.values(groupedTerms).flat()

export function getLoadingTerms(): string[] {
  return [...loadingTerms]
}
