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

### Desktop Hermes Runtime

Hermes runtime assets are built separately by
`.github/workflows/desktop-runtime.yml`. `packages/desktop/scripts/runtime-config.mjs`
pins an upstream Hermes version, Git ref, and full commit; version overrides
must supply the ref and commit together.

For releases that declare placeholder package metadata (`0.0.0`), the runtime
requires the matching `v<version>` source tag and uses upstream's install-stamp
writer without changing tracked files. Installation and relocation checks read
the canonical Hermes identity. Manual dispatches can override `python_version`
and `python_build_tag` together; Hermes 0.22.2 uses Python 3.14.7 from the
python-build-standalone `20260901` release.

The portable Node.js included in runtime assets is pinned independently from
the GitHub Actions runner. Manual runtime dispatches take a target release tag;
when the release does not exist, the upload step creates it with the workflow's
`GITHUB_TOKEN`. Do not pre-publish runtime-only releases with a user token,
because that emits `release.published` and starts the normal Web UI and Docker
release workflows.

The published runtime keeps this updateable layout:

```text
python/                 Hermes Agent Git checkout and source root
  .git/
  base/                 Windows python-build-standalone base runtime
  venv/                 bundled Python environment
    Scripts/python.exe  Windows PEP 405 venv interpreter
  agent-browser/
  node/                  browser CLI npm prefix
  ms-playwright/
node/                    bundled Node.js
git/                     bundled MinGit on Windows
runtime-manifest.json
```

`prepare:runtime` fetches the exact source commit and installs its locked
dependencies into `python/venv`. On Windows, the standalone base interpreter is
embedded at `python/base` and a sibling PEP 405 venv wraps it. Windows requires
an absolute `pyvenv.cfg` home, so the build, package validation, extraction, and
runtime migration paths rebase that value before launching Python. This lets
upstream `hermes update` safely target the environment through `VIRTUAL_ENV`.
The build also creates the upstream TUI/dashboard and verifies that the retained
checkout is clean. `package:runtime` includes the source and Git metadata in the
GitHub/CF archive and records them in schema 2 of the runtime manifest. Do not
patch tracked Hermes source during this build:
Studio-specific integration belongs in Studio, and the clean checkout is what
allows users to run the upstream `hermes update` command directly.

## Validation Surface

The minimum mechanical harness is:

- `npm run harness:check` for repository docs, workflow, and package-script invariants.
- `npm run test` or focused Vitest tests for local logic.
- `npm run test:e2e` for browser-visible routing/auth/chat regressions.
- `npm run build` for type checking and production bundles.

See `docs/harness/validation.md` for change-specific commands.
