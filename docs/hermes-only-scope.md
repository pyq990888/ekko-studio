# Hermes-only Scope

Status: approved 2026-10-24. This document is the keep/cut manifest for the
Hermes-only fork. Every slimming change should reference this file.

## Goal

Run Ekko Studio as a server-hosted Hermes Agent WebUI. Remove every runtime,
product surface, package, and delivery pipeline that is not required to operate
Hermes chat, Hermes history, Hermes configuration, or the Web UI shell.

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
- Voice/STT/TTS: removed by default. Revisit only on explicit request; it also
  removes Hermes profile voice settings and heavy native dependencies.
- Webhooks: keep through Phase 1-4, remove in Phase 5.
- Performance monitor: keep (it observes the Hermes bridge) unless removed
  later on request.
- Version preview and desktop browser: remove (server-only target).

## Deferred / compatibility

- Do not drop existing SQLite tables or rows in the first pass. Keep old
  `ekko-agent` / `coding_agent` sessions readable; do not allow new runs for
  removed runtimes.
- Keep a read-only `PersistedAgentRuntime` union for historical sessions while
  `ActiveAgentRuntime` is `hermes` only.
- Do not delete `node-pty`, `sharp`, `socket.io`, `js-tiktoken`, `adm-zip`, or
  the Vue Flow packages still used by Kanban/Journey.
- Package/CLI rename to `hermes-web-ui` happens after the functional slimming;
  keep the `ekko-studio` aliases for one transition release.

## Execution rules

- One small commit per task; no push.
- Do not mix unrelated refactors into a task.
- Keep local API routes registered before any proxy catch-all.
- Keep Hermes state (`~/.hermes`) separate from Web UI state
  (`~/.hermes-web-ui`).
- Every phase must keep Hermes login, single-chat streaming, history, terminal,
  and MCP working.
