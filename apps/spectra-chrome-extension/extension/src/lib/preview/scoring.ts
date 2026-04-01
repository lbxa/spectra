export type CandidateScoreInput = {
  landmarkMatch: number;
  layoutMatch: number;
  widthMatch: number;
  ancestorSimilarity: number;
  nearbyHeadingSimilarity: number;
};

const WEIGHTS = {
  landmarkMatch: 0.3,
  layoutMatch: 0.25,
  widthMatch: 0.2,
  ancestorSimilarity: 0.15,
  nearbyHeadingSimilarity: 0.1
} as const;

export function computeCandidateScore(input: CandidateScoreInput): number {
  return (
    normalize(input.landmarkMatch) * WEIGHTS.landmarkMatch +
    normalize(input.layoutMatch) * WEIGHTS.layoutMatch +
    normalize(input.widthMatch) * WEIGHTS.widthMatch +
    normalize(input.ancestorSimilarity) * WEIGHTS.ancestorSimilarity +
    normalize(input.nearbyHeadingSimilarity) * WEIGHTS.nearbyHeadingSimilarity
  );
}

function normalize(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
