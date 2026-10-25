# Getting started

This guide takes you from a fresh machine to a working Hermes WebUI with a
usable chat session. It assumes you already have, or can install, Hermes Agent.

## 1. Check prerequisites

```bash
node -v      # must be >= 23
python3 -V   # must be >= 3.10
hermes --version
```

If `hermes --version` fails, install Hermes Agent first. The WebUI does not
bundle it:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/install.sh | bash
```

Confirm the install is complete before continuing:

```bash
ls "$HOME/.hermes/hermes-agent/run_agent.py"
```

The WebUI needs that file to consider the installation usable.

## 2. Install the WebUI

### npm (recommended)

```bash
npm install -g hermes-web-ui
hermes-web-ui start
```

### Docker

```bash
docker run -d --name hermes-web-ui \
  -p 8648:8648 \
  -v "$HOME/.hermes:/root/.hermes:ro" \
  -v hermes-webui-data:/root/.hermes-web-ui \
  ghcr.io/ekkolearnai/hermes-web-ui:latest
```

Mount `~/.hermes` **read-only** unless you intend the container to modify your
agent configuration. See [docker.md](./docker.md) for the full matrix.

## 3. Create the admin account

```bash
hermes-web-ui reset-default-login
```

This prints `admin / 123456`. Open <http://localhost:8648>, sign in, then change
the password under **Settings → Current Account**. Do not leave the default
password on a reachable host.

## 4. Verify Hermes detection

Open **Settings → Agent** (or `GET /api/hermes/runtime-versions`). You should see:

```json
{
  "source": "user-cli",
  "pythonPath": "/path/to/python3",
  "agentRoot": "/path/to/.hermes/hermes-agent",
  "cliInstallations": [{ "version": "0.21.7", "selected": true }]
}
```

If `source` is `none`, the WebUI could not resolve your Hermes installation.
Check, in order:

| Symptom | Fix |
| --- | --- |
| `Hermes Python executable could not be resolved` | The launcher script does not lead to a Python interpreter. Set `HERMES_BIN` to the real launcher, or `HERMES_AGENT_ROOT` explicitly. |
| `ModuleNotFoundError: hermes_cli` | The probe ran outside the agent root. Set `HERMES_AGENT_ROOT` to the directory containing `run_agent.py`. |
| `agentRoot` empty | No `run_agent.py` under `HERMES_HOME/hermes-agent`. Reinstall Hermes. |

## 5. Send a first message

1. Open **Chat**
2. Pick a profile (default is `default`)
3. Pick a provider and model — if the list is empty, configure a provider under
   **Models** first
4. Send a message

A working run streams `run.started → thinking.delta → message.delta →
run.completed` and persists two rows (user + assistant) in the session store.

If the reply is empty or the model claims no prior context on a second turn,
check the server log for `failed to build compressed history`. That means the
provider runtime seam is not configured — see
[`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## 6. Next steps

| Goal | Where |
| --- | --- |
| Connect Telegram, Discord, Slack, or another channel | **Channels** |
| Schedule recurring agent work | **Jobs** |
| Track work on a board | **Kanban** |
| Add skills the agent can load | **Skills** |
| Register external MCP servers | **MCP** |
| Browse generated files | **Files** |
| Inspect logs and usage | **Logs**, **Usage** |
| Put the WebUI behind HTTPS | [docker.md](./docker.md) or your own reverse proxy |

## Troubleshooting

**Port already in use**

```bash
hermes-web-ui start 9000     # or set PORT=9000
```

**Terminal panel is blank**

`node-pty` did not build. Rebuild it against the running Node version:

```bash
npm rebuild node-pty
```

**Everything works but the UI is stale after an upgrade**

```bash
hermes-web-ui stop
hermes-web-ui start
```

The client bundle is served from `dist/`; a running server keeps the old build
in memory until restart.

**Legacy sessions show as read-only**

Expected. Sessions created by removed runtimes (Ekko, coding agents, workflow,
group chat) stay readable in History but reject new runs. The data is preserved
on purpose; see [hermes-only-scope.md](./hermes-only-scope.md).
