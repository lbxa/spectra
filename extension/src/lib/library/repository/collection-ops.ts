import type { Collection } from "../types";

export function sortCollectionsByUpdatedAt(collections: Collection[]): Collection[] {
  return collections.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}
