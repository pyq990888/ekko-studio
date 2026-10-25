<p align="center">
  <strong>Hermes WebUI</strong>
  <a href="./README_zh.md">中文</a>
</p>

<p align="center">
  A self-hosted web console for <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a>.<br/>
  Chat with your agent from a browser, manage its profiles, models, skills, MCP servers,<br/>
  jobs, Kanban board, and channels — from any device that can reach your server.
</p>

<p align="center">
  <a href="https://github.com/EKKOLearnAI/hermes-web-ui">Source</a>
  ·
  <a href="./docs/getting-started.md">Getting started</a>
  ·
  <a href="./ARCHITECTURE.md">Architecture</a>
  ·
  <code>npm install -g hermes-web-ui && hermes-web-ui start</code>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hermes-web-ui"><img src="https://img.shields.io/npm/v/hermes-web-ui?style=flat-square&color=blue" alt="npm version"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/hermes-web-ui?style=flat-square" alt="license"/></a>
</p>

> **This repository is a Hermes-only fork.** Earlier releases shipped a multi-agent
> workspace (Ekko Agent, 14 coding-agent integrations, group chat, visual
> workflows, voice, desktop/Electron packaging, and ESP32 devices). All of that has
> been removed. Hermes Agent is now the only runtime. See
> [`docs/hermes-only-scope.md`](./docs/hermes-only-scope.md) for the full
> keep/cut manifest and [`docs/hermes-only-baseline.md`](./docs/hermes-only-baseline.md)
> for the measured impact.

## What it does

Hermes Agent is powerful but terminal-bound. This WebUI puts a browser front end on
one Hermes installation so you can use it from a phone, a laptop, or a shared
machine without SSH-ing in.

| Area | Capability |
| --- | --- |
| **Chat** | Streaming replies over Socket.IO, tool-call traces, task cards with live step progress, approval and clarification prompts, message references, per-turn usage and cost |
| **History** | Persistent SQLite session store with search, categories, archiving, and message deletion; legacy sessions stay readable |
| **Agent control** | Profiles, providers, models, memory, skills, skill bundles, plugins, MCP servers, runtime versions |
| **Automation** | Cron-style jobs, Kanban board with assignees and attachments, Journey graph |
| **Channels** | 10 messaging platforms configured from one page (see below) |
| **Workspace** | File browser with inline previews, web terminal, workspace diff tracking, write-gate approval |
| **Operations** | Logs, usage and cost reports, performance monitor, themes, users and roles |

## Requirements

- **Node.js >= 23** (the repo engines field enforces this; Node 24 is tested)
- **Python 3.10+** with a working [Hermes Agent](https://github.com/NousResearch/hermes-agent) installation
- Linux, macOS, or Windows. Linux is the primary target; the Docker image is Linux-only.

The WebUI does not bundle Hermes. It discovers an existing installation through
`HERMES_HOME` (default `~/.hermes`) and reuses its Python environment.

## Install

### npm

```bash
npm install -g hermes-web-ui
hermes-web-ui start
```

Then open `http://localhost:8648`. On first run, create the admin account:

```bash
hermes-web-ui reset-default-login   # admin / 123456
```

Change that password immediately from **Settings → Current Account**.

### Docker

```bash
docker compose up -d
```

See [`docs/docker.md`](./docs/docker.md) for volumes, environment variables, and
how to mount an existing `~/.hermes`.

### From source

```bash
npm ci --ignore-scripts
npm rebuild node-pty        # native module for the web terminal
npm run build
npm start
```

`npm run build` type-checks the client and server, regenerates the OpenAPI spec,
and produces `dist/`. See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for the full command
list and coding rules.

## Configuration

All state lives under `HERMES_WEB_UI_HOME` (default `~/.hermes-web-ui`). Hermes'
own state stays in `HERMES_HOME` (default `~/.hermes`) and is never written to by
the WebUI except through documented agent APIs.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HERMES_WEB_UI_HOME` | `~/.hermes-web-ui` | WebUI database, logs, runtime downloads |
| `HERMES_HOME` | `~/.hermes` | Hermes Agent data directory |
| `PORT` | `8648` | HTTP listen port |
| `HERMES_BIN` | `hermes` on `PATH` | Explicit Hermes CLI path |
| `HERMES_AGENT_ROOT` | detected | Explicit Hermes Agent root (contains `run_agent.py`) |
| `AUTH_JWT_SECRET` | generated | Override the JWT signing secret |

Runtime detection resolves the Python interpreter by following the Hermes launcher
script, including multi-hop wrappers such as
`~/.local/bin/hermes → <install>/.hermes/bin/hermes → python3`.

## Supported channels

Telegram, Discord, Slack, WhatsApp, Matrix, Feishu (Lark), DingTalk, QQBot,
WeChat (Weixin), and WeCom — each with its own credentials, allow/ignore lists,
mention rules, and optional SOCKS proxy. Configure them in **Channels**.

## Architecture

```
browser ── Socket.IO /chat-run ──► ChatRunSocket
                                      │
                                      ▼
                                 handleBridgeRun
                                      │
                                      ▼
                              AgentBridgeClient  ──stdio──►  hermes_bridge.py
                                                                   │
                                                                   ▼
                                                            run_agent.AIAgent
```

- `packages/client` — Vue 3 client, Pinia stores, i18n (12 locales)
- `packages/server` — Koa API, Socket.IO, SQLite persistence
- `packages/shared` — helpers shared by both
- `packages/skills` — bundled `SKILL.md` files injected into Hermes profiles
- `bin/` — CLI entry points and the managed MCP stdio servers

`packages/server/src/bootstrap/realtime.ts` owns the single Socket.IO `Server`;
feature modules only attach namespaces. Full detail in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Removed in the Hermes-only fork

For anyone migrating from an older release:

- **Packages:** `ekko-agent`, `desktop` (Electron), `esp32-c3`, `esp32-s3`
- **Server:** coding-agents module, group chat, visual workflows, global agent,
  voice/STT/TTS, app relay and connections, MCU/ESP32 devices, JEV, session
  shares, Model API, announcements, media, desktop browser, LAN discovery
- **Client:** 25 of the previous 50 routes were removed; the Ekko, Agent Manager,
  Coding Agent Config, Petdex, workflow, group-chat, and voice surfaces are gone

**Your data is preserved.** SQLite tables for removed features are kept so old
sessions still render in History. New runs for removed runtimes are rejected with
`This session belongs to a removed runtime and is read-only`.

The MCP tool identifiers (`ekko_studio_*`, `ekko-studio-*`) keep their old names
because they are wire-protocol strings already written into Hermes profile
configuration. Renaming them would break existing profiles.

## Development

```bash
npm run dev              # Vite client + Koa server together
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright browser tests
npm run harness:check    # repository guardrails
npm run build            # type-check + build client and server
```

Current measured state: 328 server TS files / 58.2k LOC, 325 client files /
96.3k LOC, 488 test files, 6 CI workflows, 233 OpenAPI endpoints.

## License

BSL-1.1. See [`LICENSE`](./LICENSE).
