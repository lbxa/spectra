# Spectra

Chrome Extension (Manifest V3) for capturing visible UI elements as reusable references:

- Cropped screenshot of the selected element.
- Standalone HTML snapshot of the selected subtree.
- Source URL, title, and capture timestamp.
- Popup catalogue with screenshot + isolated replay + copy actions.

## Monorepo Placement

This extension now lives in a monorepo workspace:

- Workspace path: `apps/spectra-chrome-extension`.
- Root workspace orchestration: `package.json` scripts + `turbo.json`.
- Extension-local release config: `apps/spectra-chrome-extension/release.config.mjs`.
- Extension-local release scripts: `apps/spectra-chrome-extension/scripts/release/*`.
- Extension-local release outputs: `apps/spectra-chrome-extension/.release/*`.

Common commands:

- From repo root:
  - `bun run build`
  - `bun run typecheck`
  - `bun run test`
  - `bun run release:dry-run`
- From this workspace (`apps/spectra-chrome-extension`):
  - `bun run build`
  - `bun run typecheck`
  - `bun run test`
  - `bun run release:dry-run`

## Project Structure

- `public/manifest.json`: extension metadata and permissions.
- `extension/src/content.ts`: thin capture bootstrap/orchestrator.
- `extension/src/content/capture/capture-session.ts`: capture session runtime (input routing, overlays, commit/cancel lifecycle).
- `extension/src/content/capture/selection-runtime.ts`: selection/interaction runtime helpers.
- `extension/src/content/capture/snapshot-builder.ts`: standalone snapshot assembly.
- `extension/src/content/capture/style-policy.ts`: style allowlist/default-filter policy.
- `extension/src/content/preview-runtime/preview-session.ts`: preview session orchestration (commands, reducer dispatch, side effects).
- `extension/src/content/preview-runtime/surface-model.ts`: preview surface mode/state model.
- `extension/src/content/preview-runtime/surface-commands.ts`: command definitions for preview actions.
- `extension/src/content/preview-runtime/surface-reducer.ts`: pure preview surface transitions.
- `extension/src/content/preview-runtime/overlay-manager.ts`: centralized overlay + toolbar/HUD lifecycle.
- `extension/src/content/preview-runtime/preview-effects.ts`: imperative preview effect helpers.
- `extension/src/content/preview-runtime/diagnostics.ts`: runtime diagnostics model helpers.
- `extension/src/content/adapt/*`: Magic Button adaptation request/validation/patch-apply helpers.
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

## Imperative Surface Runtime (Current Shape)

Capture/preview are now implemented as a tool-style runtime with explicit boundaries:

- **State machine + commands**: `surface-model.ts` + `surface-commands.ts` + `surface-reducer.ts` centralize transitions and prevent implicit mode drift.
- **Session owner for side effects**: `preview-session.ts` owns listeners, runtime messaging, insert lifecycle, and teardown.
- **Overlay subsystem**: `overlay-manager.ts` owns hover/selected/ghost/label/session-toolbar/shortcuts-HUD lifecycle.
- **Effect boundary**: `preview-effects.ts` isolates imperative DOM chrome updates from state logic.
- **Input routing**: `interaction-controller.ts` handles pointer + keyboard tool routing with active/key-active predicates.
- **Capture parity**: `capture-session.ts` mirrors the same session-style boundary for capture mode and keeps `content.ts` thin.
- **Diagnostics + confidence gates**: `saved-preview-service.ts` emits structured diagnostics for fallback/unstable/partial-apply paths.

## Preview Runtime: Clean Code Factors

The content preview runtime refactor is exemplary because it improved clarity without changing runtime contracts:

- **Single-purpose modules**: `preview-entry.ts` is bootstrap-only, while session orchestration, state transitions, and helper logic are split into focused runtime modules.
- **Explicit state transitions**: preview mode changes are centralized in `surface-reducer.ts` instead of ad-hoc writes spread across handlers.
- **Lifecycle invariants in one place**: inserted preview register/remove/replace/clear logic is consolidated in a registry, reducing drift in watcher/toolbar teardown ordering.
- **Side-effect boundaries**: `preview-session.ts` and `saved-preview-service.ts` isolate runtime effects behind explicit seams.
- **Pure helper extraction**: anchor resolution, target normalization, layout normalization, and effect helpers are separated from input/event wiring.
- **Diagnostics as state**: confidence degradation (fallback anchors, unstable anchors, partial apply) is represented as diagnostics rather than hidden logs.
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

## Magic Button (MVP)

Magic Button is a one-shot adaptation flow for inserted previews:

1. User clicks the sparkles icon in the preview session toolbar.
2. Content runtime builds a structured adaptation request from page context + component pack.
3. Background calls backend `POST /v1/adapt`.
4. Validated patch is applied locally to the component artifact.
5. Adapted component is saved back through library service using the same component id (overwrite behavior).

## Current Product Behavior

Capture flow:

1. Start capture from popup.
2. Hover to preview target bounds.
3. Click an element to save:
   - standalone primary artifact (`html` + marker-scoped `cssText`),
   - cropped screenshot,
   - metadata.
4. Open popup to review screenshot vs replay and copy raw HTML when needed.
