# Architecture

Hermes WebUI is a TypeScript monorepo that ships a server-hosted Web UI for
Hermes Agent: a Vue client, a Koa backend with Socket.IO, and a Docker image.
The server integrates the Hermes Agent runtime through a Python bridge.

## Package Boundaries

| Area | Path | Responsibility |
| --- | --- | --- |
| Client | `packages/client/src` | Vue UI, routing, Pinia stores, API wrappers, i18n, browser-visible state. |
| Server | `packages/server/src` | HTTP API, auth, Socket.IO, SQLite stores, file access, Hermes runtime integration. |
| Shared | `packages/shared` | Small helpers used by both client and server. |
| Skills | `packages/skills` | Bundled Hermes `SKILL.md` files injected into profiles. |
| Tests | `tests` | Vitest unit/integration tests and Playwright browser tests. |
| CI | `.github/workflows` | Build, e2e, lockfile, Docker, and npm release automation. |

## Request Flow

1. The browser loads the Vite-built client from the Koa server.
2. Client modules call API helpers from `packages/client/src/api`.
3. Server routes in `packages/server/src/modules/*/routes` wire HTTP paths to controllers.
4. Controllers validate request concerns and delegate reusable behavior to services.
5. Services own side effects: files, SQLite, Hermes profiles, subprocesses, bridges, and credentials.
6. Long-running chat flows use the Socket.IO `/chat-run` namespace owned by
   bootstrap and attached to by the Studio chat-run module.

Keep each layer narrow. Routes should not grow business logic, and client code
should not duplicate server persistence rules.

## State And Data Ownership

- Web UI state defaults to `~/.hermes-web-ui` through `config.appHome`.
- `HERMES_WEB_UI_HOME` and `HERMES_WEBUI_STATE_DIR` override Web UI state location.
- Hermes Agent state lives under Hermes profile directories and must stay distinct from Web UI state.
- Uploads default to `config.uploadDir`, which is derived from the Web UI home unless `UPLOAD_DIR` is set.
- Runtime data directories must also live under the Web UI home, not beside built `dist` assets.
- Profile-scoped Hermes data should use existing profile helpers instead of manually joining paths.
- SQLite tables for removed runtimes are intentionally left in place so existing
  installations keep their history readable; they are never created for new
  features and are never dropped automatically.

## Server Structure

Server code is separated by business ownership under `modules/studio` and
`modules/hermes`; concrete module composition belongs in `bootstrap`.
See `docs/harness/server-module-boundaries.md` for the ownership decisions,
allowed dependency matrix, and migration rules.

- `bootstrap/realtime.ts` owns the single Socket.IO `Server`; feature modules only
  attach namespaces.
- Module `routes/` register HTTP entry points; `sockets/` own Socket.IO transports.
- Module `controllers/` handle request-level behavior.
- Module `services/` own reusable IO, domain behavior, processes, and integrations.
- Studio `repositories/` and `infrastructure/` own application persistence.
- Studio `middleware/legacy-app-api.ts` is the released-client URL compatibility map.

Architecture rules:

- Register local API routes before proxy catch-all routes.
- Keep auth behavior under `packages/server/src/modules/studio/services/auth`.
- Prefer `execFile` or `spawn` with argument arrays over shell command strings.
- Use structured file and YAML/JSON parsers when editing structured data.
- `ActiveAgentRuntime` is `hermes` only. Removed runtimes stay in
  `PersistedAgentRuntime` so historical sessions keep resolving, but new runs are
  rejected with a read-only error.

## Client Structure

- `views/` contains route-level screens.
- `components/` contains reusable UI.
- `stores/` contains Pinia state.
- `api/` contains HTTP clients and should use `packages/client/src/api/client.ts`.
- `i18n/` contains locale messages for user-facing strings.
- `styles/` contains global styling and theme primitives.

Frontend rules:

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Use existing Naive UI patterns before adding new UI conventions.
- Add visible text to all locale files.
- Keep component styles scoped unless the style is intentionally global.

## Release Flow

- Pull requests run the web UI build, tests, and harness checks in
  `.github/workflows/build.yml`.
- Published GitHub Releases run Web UI artifact packaging and Docker image
  publishing without marking the release as GitHub latest.
- `.github/workflows/docker-publish.yml` publishes the server image.
- `.github/workflows/npm-publish.yml` publishes the `hermes-web-ui` package.
- Release matrix targets keep `fail_on_unmatched_files: true` where
  platform-specific artifact lists make the expectation explicit.

## Hermes Runtime

The server discovers the Hermes Agent runtime from `HERMES_BIN`, an existing
`hermes` CLI on `PATH`, or a managed runtime under the Web UI home. Hermes
runtime downloads, activation, and version management live in
`modules/hermes/services/runtime`; Web UI self-update lives in Studio.

Docker images start from `nousresearch/hermes-agent` and only add the Node.js
runtime plus this repository's build output.

### Resolving the interpreter

Installations differ in how the `hermes` command reaches Python. Resolution
starts from the selected executable and follows the launcher until it finds an
interpreter, so all of these layouts work:

```text
# single-hop wrapper
#!/bin/sh
exec /opt/hermes/venv/bin/python3 -I -c '...'

# quoted target
#!/bin/sh
exec "/opt/hermes/venv/bin/python3" -I -c '...'

# multi-hop wrapper (~/.local/bin/hermes -> <install>/.hermes/bin/hermes -> python)
#!/bin/sh
exec /opt/hermes/.hermes/bin/hermes "$@"
```

`resolveHermesInstallationEnvironment` walks the chain (bounded, cycle-safe),
then locates the Agent Root by looking for `run_agent.py`. The CLI version probe
runs with that Agent Root on `PYTHONPATH`, mirroring what the launcher does, so
`import hermes_cli` resolves.

When resolution fails the runtime status reports the concrete reason instead of
a generic error: `Hermes Python executable could not be resolved` or
`Hermes CLI import probe failed (...)`. Both are actionable — set
`HERMES_AGENT_ROOT` or `HERMES_BIN` explicitly.

### Managed runtimes

A runtime downloaded through the Web UI lives under
`<HERMES_WEB_UI_HOME>/desktop-runtime` and is versioned independently of a
user-installed CLI. `readLockedDesktopHermesSelection` pins the choice through
`HERMES_RUNTIME_SOURCE`, `HERMES_RUNTIME_SELECTION_LOCKED`, and related
variables; without those, the server re-probes on every start.

### Chat run data flow

```text
ChatRunSocket.handleRun
  └─ handleBridgeRun
       ├─ buildCompressedHistory ──► getModelContextLength (provider-runtime facade)
       ├─ AgentBridgeClient.chat ──► hermes_bridge.py ──► run_agent.AIAgent
       └─ calcAndUpdateUsage ──► usage store
```

`buildCompressedHistory` runs on **every** turn and calls the provider runtime
facade to size the context window. `bootstrap/provider-runtime-adapter.ts` must
therefore be imported during bootstrap. If it is missing, compression throws,
history silently becomes empty, and the model answers as if the conversation had
just started — a failure mode that looks like a model bug, not a wiring bug.
`tests/server/provider-runtime-wiring.test.ts` guards this seam.


## Validation Surface

The minimum mechanical harness is:

- `npm run harness:check` for repository docs, workflow, and package-script invariants.
- `npm run test` or focused Vitest tests for local logic.
- `npm run test:e2e` for browser-visible routing/auth/chat regressions.
- `npm run build` for type checking and production bundles.

See `docs/harness/validation.md` for change-specific commands.
