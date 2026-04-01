# Spectra

Chrome Extension (Manifest V3) for capturing visible UI elements as reusable references:

- Cropped screenshot of the selected element.
- Standalone HTML snapshot of the selected subtree.
- Source URL, title, and capture timestamp.
- Popup catalogue with screenshot + isolated replay + copy actions.

## Project Structure

- `public/manifest.json`: extension metadata and permissions.
- `extension/src/content.ts`: thin capture bootstrap/orchestrator.
- `extension/src/content/capture/selection-runtime.ts`: selection/interaction runtime helpers.
- `extension/src/content/capture/snapshot-builder.ts`: standalone snapshot assembly.
- `extension/src/content/capture/style-policy.ts`: style allowlist/default-filter policy.
- `extension/src/content/capture-snapshot.ts`: scoped CSS extraction, sanitization, and asset URL rewriting primitives.
- `extension/src/background.ts`: runtime handlers + screenshot capture/crop orchestration.
- `extension/src/content/preview-insert.ts`: page preview insertion and CSS compatibility paths.
- `extension/src/lib/library/messages.ts`: canonical runtime message/event contracts + guards.
- `extension/src/lib/library/application-service.ts`: library mutation orchestration seam for background/popup callers.
- `extension/src/lib/events/chrome-runtime-event-publisher.ts`: runtime event publisher adapter.
- `extension/src/lib/library/repository.ts` + `extension/src/lib/library/repository/*`: repository public surface + split internals (idb core, normalizers, scoped ops).
- `extension/src/popup.tsx` + `extension/src/popup/*`: popup UI and library workflow.
- `extension/src/popup/hooks/use-library-state.ts`: popup hydration/loading/refresh/listener orchestration.
- `extension/src/popup/hooks/use-capture-preview-actions.ts`: popup capture/preview action orchestration.
- `samples/v1/*`: pre-pruning extraction outputs.
- `samples/v2/*`: post-pruning extraction outputs.
- `samples/v3/*`: hybrid capture outputs used for token/fidelity comparisons.

## Architecture Overview (Current)

The extension now uses small seams to reduce duplicate transport and mutation logic while preserving behavior:

- **Canonical contracts**: runtime command/event envelopes are centralized in `extension/src/lib/library/messages.ts`.
- **Application service seam**: UI/background mutation callers use `LibraryApplicationService`, not ad-hoc event payload creation.
- **Event publishing seam**: domain events are mapped to runtime envelopes by `ChromeRuntimeEventPublisher`.
- **Capture decomposition**: `content.ts` orchestrates; capture computation/policy lives under `extension/src/content/capture/*`.
- **Shared host signature logic**: capture and preview ranking use the same implementation in `extension/src/lib/preview/host-signature.ts`.
- **Repository split**: indexedDB primitives, normalizers, and operation helpers are split into focused modules under `extension/src/lib/library/repository/*`.

## Preview Runtime: Clean Code Factors

The content preview runtime refactor is exemplary because it improved clarity without changing runtime contracts:

- **Single-purpose modules**: `preview-entry.ts` is now bootstrap-only, while orchestration, state transitions, and helper logic are split into focused runtime modules.
- **Explicit state transitions**: preview mode changes (`idle`, `targeting`, `inserted`) are centralized in a reducer instead of ad-hoc writes spread across handlers.
- **Lifecycle invariants in one place**: inserted preview register/remove/replace/clear logic is consolidated in a registry, reducing drift in watcher/toolbar teardown ordering.
- **Side-effect boundaries**: saved preview save/load/apply behavior is isolated in a dedicated service with a shared busy-state wrapper.
- **Pure helper extraction**: anchor resolution, target normalization, and layout normalization are separated from imperative event wiring.
- **Behavior-preserving verification**: characterization tests plus `bun run typecheck` and `bun run build` gates were run to validate parity.

## File Naming Convention

- Use `kebab-case` for non-component filenames.
- Use `PascalCase` for React component filenames.
- Keep symbol naming idiomatic: React components remain `PascalCase`.

## Build and Typecheck

This repo uses TypeScript with `chrome-types`.

```bash
bun run typecheck
bun run build
```

## Release and Alpha Packaging Protocol

Spectra release automation uses semantic-release with Conventional Commits and two channels:

- `main` -> stable releases (`x.y.z`).
- `alpha` -> prereleases (`x.y.z-alpha.N`).

### Semver Rules (Common Sense)

- `major`: commit includes `BREAKING CHANGE` or `!` in the Conventional Commit header.
- `minor`: `feat`.
- `patch`: `fix`, `perf`, `refactor`, `revert`.
- no release by default: `docs`, `test`, `style`, `chore`, `ci`, `build`.

### Chrome Extension Version Rules

Chrome manifest versions cannot contain prerelease tags directly. To keep semver intent and Chrome compatibility:

- Semantic prerelease: `1.4.0-alpha.3`
- Manifest `version`: `1.4.0.3`
- Manifest `version_name`: `1.4.0-alpha.3`

Stable releases use the same value for both `version` and `version_name` (for example `1.4.0`).

### CI/CD Outputs for Alpha Testing

Each release publish should produce both:

- A GitHub Packages npm artifact (versioned by semantic-release).
- A downloadable extension ZIP assembled from `dist/` contents (zip root includes `manifest.json`).

### Operational Guardrails

- Release workflow runs on push to `alpha` and `main`.
- Use full git history in CI for semantic-release commit analysis (`fetch-depth: 0`).
- Keep auth in CI secrets and workflow tokens only (`GITHUB_TOKEN`/`NODE_AUTH_TOKEN`); never commit credentials.
- Validate with repo gates before publish: `bun run typecheck`, `bun run build`, `bun run test`.

### Local Release Checks

- Dry run semantic-release without publishing: `bun run release:dry-run`
- Run required verification gates before any release push:

```bash
bun run typecheck
bun run build
bun run test
```

## Snapshot Capture Architecture (Fidelity-First)

The capture pipeline uses a single persisted artifact:

- **Primary artifact (fidelity-locked)**:
  - `html`: cloned subtree with inline computed styles.
  - `cssText`: selector-matched, scope-prefixed stylesheet rules with marker `/*__spectra_scoped_css_v1__*/`.
  - Used for preview insertion and local persistence.
  - Optimized in-place with conservative default/no-op suppression to reduce redundant style output.

### Non-Negotiable Policy

- Visual fidelity quality must be preserved.
- Optimization changes must not degrade preview insertion behavior for:
  - marker-tagged scoped CSS payloads, and
  - legacy unmarked CSS payloads (runtime scope fallback).
- Redundancy removal and compaction happen on the primary artifact only when fidelity-safe.

### Capture Pipeline Summary

1. Clone selected subtree.
2. Inline computed styles per allowlist/default-filter policy.
3. Sanitize unsafe nodes/attributes and rewrite asset URLs.
4. Collect selector-matched stylesheet rules scoped to capture root.
5. Persist primary artifact (`html`, marker `cssText`) plus screenshot and metadata.

### Verification Gates

- **Efficiency gate**: primary capture artifact should be materially smaller on representative noisy captures after default/no-op suppression changes.
- **Fidelity gate**: preview insertion behavior and marker/legacy compatibility tests must remain green.

## Current Product Behavior

Capture flow:

1. Start capture from popup.
2. Hover to preview target bounds.
3. Click an element to save:
   - standalone primary artifact (`html` + marker-scoped `cssText`),
   - cropped screenshot,
   - metadata.
4. Open popup to review screenshot vs replay and copy raw HTML when needed.
