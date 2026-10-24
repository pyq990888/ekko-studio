# Agent Map

This file is a short map for coding agents. Keep detailed guidance in `docs/`
and keep this file small enough to fit into every task context.

## First Reads

- `DEVELOPMENT.md` - project commands, coding rules, test rules, and PR shape.
- `ARCHITECTURE.md` - package boundaries, data ownership, and runtime flow.
- `docs/hermes-only-scope.md` - the keep/cut manifest for the Hermes-only WebUI.
- `docs/harness/README.md` - how this repository is prepared for agent work.
- `docs/harness/validation.md` - which checks to run for each change type.
- `docs/harness/worktree-runbook.md` - isolated local dev and test setup.
- `docs/harness/pr-review.md` - self-review checklist before pushing.
- `docs/harness/server-module-boundaries.md` - target backend modules, ownership, and dependency rules.
- `docs/harness/frontend-ui.md` - required theme surfaces, UI exceptions and automatic checks.

## Common Commands

```bash
npm ci --ignore-scripts
npm run harness:check
npm run test
npm run test:e2e
npm run build
```

Use the smallest relevant check while iterating. Before a broad PR, run
`npm run harness:check`, `npm run test:coverage`, `npm run test:e2e`, and
`npm run build`.

## Code Ownership Map

- `packages/client/src` - Vue 3 client, stores, routes, i18n, API helpers.
- `packages/server/src` - Koa API, Socket.IO, persistence, Hermes integration.
- `packages/shared` - helpers shared by the client and server.
- `packages/skills` - bundled Hermes `SKILL.md` files.
- `tests/client`, `tests/server`, `tests/shared` - Vitest coverage.
- `tests/e2e` - Playwright browser coverage with mocked backend services.
- `.github/workflows` - CI, release, Docker, and npm packaging automation.

## Hard Rules

- Keep routes thin: put request handling in controllers and reusable behavior in services.
- Put new server code under `modules/studio` or `modules/hermes`; compose modules only from `bootstrap`.
- `bootstrap/realtime.ts` owns the single Socket.IO `Server`; feature modules only attach namespaces.
- `ActiveAgentRuntime` is `hermes` only. Removed runtimes stay in
  `PersistedAgentRuntime` so historical sessions keep resolving, but new runs
  must be rejected as read-only.
- Keep Web UI state under `HERMES_WEB_UI_HOME` or `HERMES_WEBUI_STATE_DIR`.
- Keep Hermes Agent state separate from Web UI state.
- Register local API routes before proxy catch-all routes.
- Use structured APIs and argument arrays instead of shell string construction.
- Add user-facing strings to every locale file.
- Do not drop SQLite tables for removed runtimes; keep old rows readable.
- Do not mix unrelated refactors into a bug fix.
- New UI must follow the theme surface contract in `docs/harness/frontend-ui.md`; do not expand the legacy style baseline to bypass checks.

## When The Agent Gets Stuck

Improve the harness instead of repeating the same prompt. Add missing docs,
tests, logs, scripts, or CI checks so the next agent can see and verify the
constraint directly.
