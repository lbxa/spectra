# Agent Conventions

## Workflow Guardrails

- Check `AGENT_LEARNINGS.md` at the start of implementation/review work and follow any active guidance there as part of the standard workflow.
- Run verification gates before claiming completion:
  - `bun run typecheck`
  - `bun run build`
- Preserve the capture pipeline's fidelity-first policy:
  - Do not ship optimizations that regress preview insertion behavior.
  - Keep compatibility for both marker-tagged scoped CSS payloads and legacy unmarked CSS payloads.
- Respect architecture seams when modifying extension logic:
  - Keep runtime message/event contracts in `extension/src/lib/library/messages.ts`.
  - Route library mutations through `LibraryApplicationService` instead of ad-hoc payload assembly.

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