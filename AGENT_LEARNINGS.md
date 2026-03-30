- Preview toolbar dropdowns should inherit shadcn dropdown spacing defaults (avoid custom content/item padding overrides) and must set content z-index above overlay root (`#spectra-root` at `2147483647`), e.g. `z-[2147483648]`.

## Capture / Snapshot Fidelity Lock

- Treat render capture artifacts (`html` + marker-scoped `cssText`) as fidelity-first contracts; avoid optimization changes here unless explicit visual parity validation is included.
- Keep a single capture artifact contract; do not introduce redundant parallel payloads that duplicate HTML/CSS content.
- Any compaction/default suppression must happen directly in the primary capture path and remain conservative enough to preserve visual fidelity.
- Do not drop fidelity-sensitive default resets in capture output (typography inheritance, `appearance`, overflow/interaction defaults, and SVG stroke/fill geometry defaults); these protect replay against host-page CSS bleed.
- Keep marker/legacy CSS compatibility behavior intact in preview insertion (`extension/src/content/preview-insert.ts`).
- Whenever capture/token policies change, update both docs (`README.md`, `AGENT_LEARNINGS.md`) and characterization tests in the same PR.
