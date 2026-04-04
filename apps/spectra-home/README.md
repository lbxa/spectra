# spectra-home

Clean React + Vite baseline for Spectra Home.

## Included

- Tailwind CSS v4 via `@tailwindcss/vite`
- shadcn/ui initialized for Vite
- `@/*` alias mapped to `src/*`

## Commands

- `bun run dev`
- `bun run build`
- `bun run lint`

## Orb Rendering Learnings

- `UnrealBloomPass` with a single `EffectComposer` can introduce dark/opaque backdrop artifacts in transparent, clipped orb containers.
- To keep bloom while preserving transparency, use an alpha-safe dual-composer flow:
  - render bloom offscreen (`bloomComposer`)
  - composite in a final pass with a `ShaderPass` that preserves base alpha (`vec4(base.rgb + bloom.rgb * strength, base.a)`).
- Keep popup usage on `bloom: false` as a safe containment path for small icon surfaces.
- Home can keep bloom enabled after alpha-safe composition is in place.
