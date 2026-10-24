# Hermes-only Scope

Status: approved 2026-10-24, implementation complete on branch
`refactor/hermes-only`. This document is the keep/cut manifest for the
Hermes-only WebUI.

## Goal

Hermes WebUI is a server-hosted Web UI for Hermes Agent. Every runtime, product
surface, package, and delivery pipeline that is not required to operate Hermes
chat, Hermes history, Hermes configuration, or the Web UI shell has been removed.

## Keep

- Web UI shell: login/auth/users/roles, theme, files, upload/download/preview,
  logs, health, static serving, Web UI self-update.
- Hermes: profiles, providers/models, config, skills, skill bundles, plugins,
  memory, terminal, jobs/cron, kanban, journey, MCP, write-gate,
  channels/weixin, runtime versions, history.
- Single chat: Socket.IO `/chat-run` -> Studio `ChatRunSocket` ->
  `handleBridgeRun` -> Hermes bridge -> Python `run_agent.AIAgent`.
- Shared platform glue: auth/users, config, logging, SQLite, profile-config,
  safe-file-store, files/workspace/path policy, model catalog/provider
  catalog/context, chat-run/session-store/usage/workspace, session uploads,
  MCP capability/auto-injection, agent status, Hermes history adapter.
- Packages: `packages/client`, `packages/server`, `packages/shared`,
  `packages/skills`, `bin/`, and the server-only build/scripts.
- `bin/ekko-studio-mcp.mjs` is Hermes infrastructure (managed MCP injection);
  keep it and prune removed toolsets, do not delete it by name.

## Remove

- Ekko Agent: `packages/ekko-agent`, `packages/server/src/modules/ekko`,
  `packages/client/src/views/ekko`, `components/ekko`, `api/ekko`.
- 14 coding agents: `packages/server/src/modules/coding-agents`,
  `views/hermes/AgentManagerView.vue`, `CodingAgentConfigView.vue`,
  `components/coding-agents`, `api/coding-agents*`, `config/agents.json`
  entries other than Hermes.
- Cross-agent Studio surfaces: group chat, workflow, global agent.
- Product extras: pets/petdex, social messages, App connections/relay/P2P,
  MCU/ESP32 devices and firmware, JEV, session shares, Model API,
  announcements, media, desktop browser, API relay (APIKEY.FAN),
  desktop/Electron packaging.
- Voice/STT/TTS: removed. It also removed Hermes profile voice settings and the
  heavy native dependencies (`sherpa-onnx-*`, `node-edge-tts`, `@audio/*`,
  `ffmpeg`).
- Webhooks: generic `chat.*` webhooks kept; `group.*`/`workflow.*` event types
  removed.
- Performance monitor: kept (it observes the Hermes bridge).
- Version preview and desktop browser: removed (server-only target).

## Deferred / compatibility

- Do not drop existing SQLite tables or rows. Old `ekko-agent` / `coding_agent`
  sessions stay readable; new runs for removed runtimes are rejected with a
  read-only error (`This session belongs to a removed runtime and is read-only`).
- `PersistedAgentRuntime` keeps the historical union (Ekko + 14 coding ids) so
  old rows keep resolving, while `ActiveAgentRuntime` is `hermes` only.
- `bin/ekko-studio-mcp.mjs` keeps its filename and its `ekko_studio_*` /
  `ekko-studio-*` tool identifiers because those are wire-protocol names already
  written into Hermes profiles. Only display text was rebranded.
- Do not delete `node-pty` (Hermes terminal), `sharp` (image previews),
  `socket.io` (chat transport), `js-tiktoken` (compression), `adm-zip` (skill
  archives), or the Vue Flow packages used by Kanban/Journey.

## Resulting shape

- Packages: `client`, `server`, `shared`, `skills`. `ekko-agent`, `desktop`,
  `esp32-c3`, `esp32-s3` deleted.
- Server: `modules/studio` + `modules/hermes` only. `bootstrap/realtime.ts`
  owns the single Socket.IO `Server`.
- Client: 25 Hermes/core routes; 23 Hermes views; locale payload reduced ~40%.
- Root dependencies: 27 -> 13; optional `sherpa-onnx-*` and the `overrides`
  block removed; lockfile 1,038 -> 942 packages.
- CI: 15 -> 6 workflows.
- OpenAPI: 233 endpoints, zero removed-feature paths.
- Server bundle: 12.7 MB -> 7.7 MB.

## Execution rules

- One small commit per task; no push.
- Do not mix unrelated refactors into a task.
- Keep local API routes registered before any proxy catch-all.
- Keep Hermes state (`~/.hermes`) separate from Web UI state
  (`~/.hermes-web-ui`).
- Every phase must keep Hermes login, single-chat streaming, history, terminal,
  and MCP working.
