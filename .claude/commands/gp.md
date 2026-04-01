Git push
ADD all modified and new files to git. If you think there are files that should not be in version control, ask the user. If you see files that should be bundled into separate commits, ask the user.
THEN commit with a clear and concise one-line Conventional Commit message: type(scope): description.
Use release-aware commit types:
- major: include `!` in header and add `BREAKING CHANGE:` footer.
- minor: `feat`.
- patch: `fix`, `perf`, `refactor`, `revert`.
- no release by default: `docs`, `test`, `style`, `chore`, `ci`, `build`.
Do not manually bump versions in commits unless the user explicitly asks. Versioning is automated by semantic-release.
Before push, run verification gates when feasible: `bun run typecheck`, `bun run build`, `bun run test`.
If pushing `alpha` or `main`, assume release automation may run and choose commit types intentionally.
THEN push the commit to origin.
The user is EXPLICITLY asking you to perform these git tasks.
