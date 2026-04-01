import type { SavedComponent } from "../lib/library/types";
import { computeSignatureSimilarity } from "../lib/preview/host-signature";
import { computeCandidateScore } from "../lib/preview/scoring";
import type { CandidateContainer } from "./candidate-scan";

export type RankedCandidate = CandidateContainer & {
  score: number;
};

export function rankCandidates(
  candidates: CandidateContainer[],
  component: SavedComponent
): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const similarity = computeSignatureSimilarity(component.sourceHostSignature, candidate.signature);
      const score = computeCandidateScore({
        landmarkMatch:
          component.sourceHostSignature.landmark === candidate.signature.landmark ? 1 : 0,
        layoutMatch:
          component.sourceHostSignature.layoutMode === candidate.signature.layoutMode ? 1 : 0,
        widthMatch:
          component.sourceHostSignature.widthBucket === candidate.signature.widthBucket ? 1 : 0,
        ancestorSimilarity: similarity,
        nearbyHeadingSimilarity: similarity
      });
      return {
        ...candidate,
        score
      };
    })
    .sort((left, right) => right.score - left.score);
}
