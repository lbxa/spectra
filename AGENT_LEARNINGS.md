## Capture and Preview

- Preserve visual fidelity first; optimize only when behavior parity is proven.
- Keep one canonical capture artifact contract; avoid parallel payload formats.
- Prefer safe degradation when confidence is low instead of silent best-guess behavior.

## Architecture Boundaries

- Keep runtime contracts and domain mutation/event seams centralized.
- Keep entry files orchestration-only; move domain logic into focused runtime modules.
- Keep side effects owned by one controller/session boundary, not scattered across components.
- Keep UI components mostly declarative and command-dispatch oriented.

## Imperative Runtime Design

- Model capture/preview as a mini-editor runtime, not a standard app screen.
- Use explicit mode/command transitions to avoid implicit boolean state drift.
- Centralize overlay lifecycle and input routing so behavior remains coherent.
- Treat diagnostics as product state (for confidence, fallback, and partial success), not just logs.

## Verification Discipline

- Lock behavior with characterization and targeted UI stability tests before large refactors.
- Run required verification gates (`typecheck`, `build`) before claiming completion.
- When behavior-affecting policies change, update docs and tests in the same change set.
