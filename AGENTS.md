# Agent Conventions

## Workflow Guardrails

- Check `AGENT_LEARNINGS.md` at the start of implementation/review work and follow any active guidance there as part of the standard workflow.
- In this monorepo, keep Chrome extension implementation and release changes scoped to `apps/spectra-chrome-extension` unless root workspace orchestration changes are explicitly required.
- Run verification gates before claiming completion:
  - `bun run typecheck`
  - `bun run build`
- Preserve the capture pipeline's fidelity-first policy:
  - Do not ship optimizations that regress preview insertion behavior.
  - Keep compatibility for both marker-tagged scoped CSS payloads and legacy unmarked CSS payloads.
- Respect architecture seams when modifying extension logic:
  - Keep runtime message/event contracts in `apps/spectra-chrome-extension/extension/src/lib/library/messages.ts`.
  - Route library mutations through `LibraryApplicationService` instead of ad-hoc payload assembly.

## Release and Versioning Protocol

- Drive release versions from semantic-release using Conventional Commits:
  - `BREAKING CHANGE` footer or `!` after type/scope -> `major`.
  - `feat` -> `minor`.
  - `fix`, `perf`, `refactor`, `revert` -> `patch`.
  - `docs`, `test`, `style`, `chore`, `ci`, `build` -> no release by default.
- Use channel branches:
  - `main` publishes stable versions: `x.y.z`.
  - `alpha` publishes prerelease versions: `x.y.z-alpha.N`.
- Keep Chrome manifest versioning valid and deterministic:
  - Manifest `version` must stay Chrome-compatible (`1-4` dot-separated integers).
  - For prerelease `x.y.z-alpha.N`, write manifest `version` as `x.y.z.N`.
  - Mirror the full semver string in manifest `version_name` (for example `1.4.0-alpha.3`).
- Release outputs for alpha testing must include both:
  - GitHub Packages npm publish for versioned distribution.
  - A versioned extension ZIP built from `dist/` contents (zip root includes `manifest.json`).
- Release workflow must use least-privilege permissions and secret-based auth only:
  - `contents: write` and `packages: write` in CI.
  - Use `GITHUB_TOKEN`/`NODE_AUTH_TOKEN` from workflow environment; never commit credentials.

## Preview Runtime Refactor Quality Bar

When evaluating content preview runtime work (for example `preview-entry.ts`, `preview-insert.ts`, `preview-session-toolbar.ts`), treat the following factors as the clean-code bar:

- Keep `preview-entry.ts` orchestration/bootstrap focused; push domain logic into dedicated runtime modules.
- Prefer explicit reducer-driven state transitions over scattered mutable state updates.
- Keep inserted preview lifecycle invariants (register/remove/replace/clear/teardown) in one registry seam.
- Isolate saved preview save/load/apply side effects behind a service boundary with shared busy-state handling.
- Keep pure utilities (target normalization, anchor resolution, layout normalization) separate from DOM/event side effects.
- Preserve behavior and contracts; verify with characterization tests plus `bun run typecheck` and `bun run build`.

## Imperative Surface Runtime Baseline

Treat capture and preview as a mini-editor runtime, not ordinary page UI.

- Keep `apps/spectra-chrome-extension/extension/src/content.ts` and `apps/spectra-chrome-extension/extension/src/content/preview-entry.ts` bootstrap-only.
- Keep preview surface state/commands/transitions explicit:
  - `apps/spectra-chrome-extension/extension/src/content/preview-runtime/surface-model.ts`
  - `apps/spectra-chrome-extension/extension/src/content/preview-runtime/surface-commands.ts`
  - `apps/spectra-chrome-extension/extension/src/content/preview-runtime/surface-reducer.ts`
- Keep side effects centralized in `apps/spectra-chrome-extension/extension/src/content/preview-runtime/preview-session.ts` + `preview-effects.ts`; avoid direct DOM writes from view components.
- Route overlay/session chrome through `apps/spectra-chrome-extension/extension/src/content/preview-runtime/overlay-manager.ts`.
- Route pointer/keyboard input through `apps/spectra-chrome-extension/extension/src/content/targeting/interaction-controller.ts`; do not reintroduce ad-hoc global listener paths in preview controller code.
- Keep capture interaction/session lifecycle under `apps/spectra-chrome-extension/extension/src/content/capture/capture-session.ts` with explicit cleanup ownership.
- Treat diagnostics as product state (not logs) via `apps/spectra-chrome-extension/extension/src/content/preview-runtime/diagnostics.ts` and confidence-gated apply behavior in `saved-preview-service.ts`.

## File Naming

- Follow React conventions for components: use `PascalCase` for React component filenames and component symbols.
- Use `kebab-case` as the default for non-component filenames.
- Keep naming consistent within each feature folder to avoid import casing drift.

## Review guidelines

- Prioritize issues by impact: correctness, security, data integrity, and maintainability come before style preferences.
- Match review depth to risk: high-risk changes (auth, data writes, cross-cutting architecture, concurrency) need strict scrutiny; low-risk UI copy or isolated tweaks should be lightweight.
- Distinguish clearly between blockers and suggestions. Block only for issues likely to cause bugs, regressions, or architectural debt.
- Avoid pedantry: do not block on personal preferences when code is clear, consistent with local patterns, and safe.
- Preserve momentum: prefer small, actionable feedback that unblocks shipping while tracking non-critical improvements separately.

## Learnings

### Capture and Preview

- Preserve visual fidelity first; optimize only when behavior parity is proven.
- Keep one canonical capture artifact contract; avoid parallel payload formats.
- Prefer safe degradation when confidence is low instead of silent best-guess behavior.

### Architecture Boundaries

- Keep runtime contracts and domain mutation/event seams centralized.
- Keep entry files orchestration-only; move domain logic into focused runtime modules.
- Keep side effects owned by one controller/session boundary, not scattered across components.
- Keep UI components mostly declarative and command-dispatch oriented.

### Imperative Runtime Design

- Model capture/preview as a mini-editor runtime, not a standard app screen.
- Use explicit mode/command transitions to avoid implicit boolean state drift.
- Centralize overlay lifecycle and input routing so behavior remains coherent.
- Treat diagnostics as product state (for confidence, fallback, and partial success), not just logs.

### Verification Discipline

- Lock behavior with characterization and targeted UI stability tests before large refactors.
- Run required verification gates (`typecheck`, `build`) before claiming completion.
- When behavior-affecting policies change, update docs and tests in the same change set.
