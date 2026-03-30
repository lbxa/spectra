# Spectra

Chrome Extension (Manifest V3) for capturing visible UI elements as reusable references:

- Cropped screenshot of the selected element.
- Standalone HTML snapshot of the selected subtree.
- Source URL, title, and capture timestamp.
- Popup catalogue with screenshot + isolated replay + copy actions.

## Project Structure

- `public/manifest.json`: extension metadata and permissions.
- `extension/src/content.ts`: selection overlay and capture runtime entrypoint.
- `extension/src/content/capture-snapshot.ts`: scoped CSS extraction, sanitization, and asset URL rewriting.
- `extension/src/background.ts`: screenshot capture/crop and local persistence.
- `extension/src/content/preview-insert.ts`: page preview insertion and CSS compatibility paths.
- `extension/src/popup.tsx` + `extension/src/popup/*`: popup UI and library workflow.
- `samples/v1/*`: pre-pruning extraction outputs.
- `samples/v2/*`: post-pruning extraction outputs.
- `samples/v3/*`: hybrid capture outputs used for token/fidelity comparisons.

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
