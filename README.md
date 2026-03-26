# Spectra

Chrome Extension (Manifest V3) for capturing visible UI elements as reusable references:

- Cropped screenshot of the selected element.
- Standalone HTML snapshot of the selected subtree.
- Source URL, title, and capture timestamp.
- Popup catalogue with screenshot + isolated replay + copy actions.

## Project Structure

- `extension/manifest.json`: extension metadata and permissions.
- `extension/src/content.ts`: selection overlay and HTML snapshot extraction.
- `extension/src/background.ts`: screenshot capture/crop and local persistence.
- `extension/src/popup.ts`: popup rendering, replay iframe, copy actions.
- `samples/v1/*`: pre-pruning extraction outputs.
- `samples/v2/*`: post-pruning extraction outputs.

## Build and Typecheck

This repo uses TypeScript with `chrome-types`.

```bash
bun run typecheck
bun run build
```

## Extraction Pruning Efficiency (Recent Changes)

The extraction pipeline was optimized to reduce snapshot size while preserving replay fidelity.

### What Changed

1. Filtered CSS serialization in `extension/src/content.ts`
   - Replaced full computed-style dumping with a property allowlist focused on visual/layout-critical CSS.
   - Dropped custom properties (`--*`) from per-node inline style output.
   - Dropped vendor-prefixed `-webkit-*` properties in exported inline styles.
   - Added targeted filtering for default/no-op values (for example `filter: none`, `transform: none`, zero-duration transitions/animations, etc.).

2. Sanitization of noisy attributes in `extension/src/content.ts`
   - Removed inline event handlers (`on*`).
   - Removed `data-*` attributes.
   - Removed `class` attributes from cloned output.
   - Removed empty `style` attributes.

3. Storage protection in `extension/src/background.ts`
   - Added a snapshot-size soft guard before `chrome.storage.local.set`.
   - Uses ~90% of `chrome.storage.local.QUOTA_BYTES` as a practical safety threshold.
   - Returns a clear error when a capture would exceed safe storage size.

4. User-facing error handling in popup/content
   - Added explicit messaging for oversized snapshots so failure reason is clear and actionable.

### Performance Impact

Measured from sample captures.

Bash script used:

```bash
for f in "samples/v2"/*.html; do
  b=$(basename "$f")
  v1="samples/v1/$b"
  if [ -f "$v1" ]; then
    size_v1=$(wc -c < "$v1" | tr -d ' ')
    size_v2=$(wc -c < "$f" | tr -d ' ')
    diff=$((size_v1 - size_v2))
    pct=$(awk -v a="$size_v1" -v b="$size_v2" 'BEGIN{printf "%.2f", (1-(b/a))*100}')
    ratio=$(awk -v a="$size_v1" -v b="$size_v2" 'BEGIN{printf "%.2f", a/b}')
    printf "%s,%s,%s,%s,%s,%s\n" "$b" "$size_v1" "$size_v2" "$diff" "$pct" "$ratio"
  fi
done
```

| Component | v1 size (bytes) | v2 size (bytes) | bytes saved | reduction | shrink ratio |
| --- | ---:| ---:| ---:| ---:| ---:|
| `figma-design-button.html` | 1,633,632 | 42,161 | 1,591,471 | 97.42% | 38.75x |
| `pinterest-nav.html` | 7,998,725 | 167,342 | 7,831,383 | 97.91% | 47.80x |

### Why This Improves Performance

- **Faster capture serialization**: fewer properties written per node.
- **Lower storage pressure**: dramatically smaller HTML payloads reduce risk of quota failures.
- **Better popup responsiveness**: smaller `srcdoc` snapshots improve iframe replay load/render time.
- **More reliable saves**: explicit size guard fails early with clear guidance instead of opaque storage errors.

## Current Product Behavior

Capture flow:

1. Start capture from popup.
2. Hover to preview target bounds.
3. Click an element to save:
   - standalone HTML snapshot (pruned inline styles),
   - cropped screenshot,
   - metadata.
4. Open popup to review screenshot vs replay and copy HTML (or HTML + CSS, same inline snapshot payload).
