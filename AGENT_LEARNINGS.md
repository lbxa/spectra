- Preview toolbar dropdowns should inherit shadcn dropdown spacing defaults (avoid custom content/item padding overrides) and must set content z-index above overlay root (`#spectra-root` at `2147483647`), e.g. `z-[2147483648]`.

## Capture / Snapshot Fidelity Lock

- Treat render capture artifacts (`html` + marker-scoped `cssText`) as fidelity-first contracts; avoid optimization changes here unless explicit visual parity validation is included.
- Keep a single capture artifact contract; do not introduce redundant parallel payloads that duplicate HTML/CSS content.
- Any compaction/default suppression must happen directly in the primary capture path and remain conservative enough to preserve visual fidelity.
- Do not drop fidelity-sensitive default resets in capture output (typography inheritance, `appearance`, overflow/interaction defaults, and SVG stroke/fill geometry defaults); these protect replay against host-page CSS bleed.
- Keep marker/legacy CSS compatibility behavior intact in preview insertion (`extension/src/content/preview-insert.ts`).
- Whenever capture/token policies change, update both docs (`README.md`, `AGENT_LEARNINGS.md`) and characterization tests in the same PR.

## Architecture Simplification Guardrails

- Runtime transport contracts are canonical in `extension/src/lib/library/messages.ts`; avoid redefining command/event payload types in content/popup modules.
- Library mutations should flow through `extension/src/lib/library/application-service.ts` so event emission stays centralized and consistent.
- Runtime event delivery should use the publisher seam (`extension/src/lib/events/event-publisher.ts` + `chrome-runtime-event-publisher.ts`) instead of duplicated direct `chrome.runtime.sendMessage` helper logic in multiple callers.
- Keep `extension/src/content.ts` orchestration-only; add capture logic under `extension/src/content/capture/*` (selection runtime, snapshot builder, style policy).
- Keep host-signature computation single-sourced in `extension/src/lib/preview/host-signature.ts` for both capture and preview ranking paths.
- Keep popup orchestration in hooks (`extension/src/popup/hooks/use-library-state.ts`, `use-capture-preview-actions.ts`) and keep UI components view-focused.
- Repository behavior is stable API-first (`libraryRepository`), with internals split under `extension/src/lib/library/repository/*`; preserve external behavior/contracts when extending internals.
- Keep cross-feature popup shell state (for example active space/tab selection like `library` vs `previews`) in a dedicated app-shell/meta slice, not in domain slices such as collections or previews. Domain slices should only own state intrinsic to that domain.
