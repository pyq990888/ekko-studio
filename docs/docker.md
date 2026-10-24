# Docker Compose Guide

This repository ships an environment-variable driven Docker Compose setup for
the server-only Hermes Web UI. The container bundles the Hermes Agent runtime
from the `nousresearch/hermes-agent` base image and serves the Web UI on port
`6060`.

## Quick Start

### Pull pre-built image (recommended)

```bash
WEBUI_IMAGE=ekkoye8888/hermes-web-ui docker compose up -d
docker compose logs -f hermes-webui
```

### Build from source

```bash
docker compose up -d --build
docker compose logs -f hermes-webui
```

Open: `http://localhost:6060`

The auth token is created on first start and printed to the container logs. It
is also stored at `./hermes_data/hermes-web-ui/.token`.

## Services

This compose file runs a single service:

- `hermes-webui` — Web UI dashboard with the Hermes Agent runtime available
  through the base image (pre-built image or built from source).

The Dockerfile is multi-stage: the build stage installs Node.js and native build
tools, builds the client/server bundles, bundles skills, prunes development
dependencies, and verifies the Sharp runtime. The runtime stage copies only the
built `bin/`, `dist/`, production `node_modules`, and package metadata into the
Hermes Agent base image. Build toolchains and source trees are not shipped.

## Environment Variables

All key runtime settings are configured from compose variables.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `6060` | Web UI listen port |
| `BIND_HOST` | `0.0.0.0` | Optional Web UI bind host. Defaults to IPv4 for stable WSL/Windows access. Set `::` explicitly for IPv6. |
| `CORS_ORIGINS` | same host only | Comma- or space-separated cross-origin allowlist for HTTP, Socket.IO, and WebSocket requests. Set `*` only when intentionally using legacy wildcard CORS. |
| `HERMES_LAN_ADVERTISE_URL` | unset | Reachable Docker host origin used for LAN discovery/links. Example: `http://192.168.1.20:6060`. |
| `HERMES_BIN` | `/opt/hermes/.venv/bin/hermes` | Path to the Hermes CLI binary. |
| `HERMES_WEB_UI_AUTH_JWT_EXPIRES_IN` | `30d` | Lifetime of Web UI auth tokens. |
| `HERMES_WEB_UI_XAI_CALLBACK_BIND_HOST` | `0.0.0.0` | Bind host for the xAI OAuth callback listener. |
| `HERMES_PATCH_SCRIPT` | unset | Optional deployment-owned patch script run before the server starts. |
| `HERMES_ALLOW_ROOT_GATEWAY` | `1` | Allows the managed Hermes gateway to run as root in the container. |
| `WEBUI_IMAGE` | `hermes-web-ui-local:latest` | Web UI image name (set to `ekkoye8888/hermes-web-ui` for the pre-built image). |
| `HERMES_DATA_DIR` | `./hermes_data` | Hermes and Web UI state directory on the host. |

Override variables directly from the shell:

```bash
PORT=16060 docker compose up -d
```

Or create a `.env` file in the project root:

```env
WEBUI_IMAGE=ekkoye8888/hermes-web-ui
PORT=6060
```

The Dockerfile accepts build arguments:

```bash
docker compose build \
  --build-arg BASE_IMAGE=nousresearch/hermes-agent:latest \
  --build-arg NODE_VERSION=24.22.1
```

## Data Persistence

| Path | Description |
|---|---|
| `${HERMES_DATA_DIR}` (`./hermes_data`) | Hermes runtime data (sessions, config, profiles), mapped to `/home/agent/.hermes`. |
| `${HERMES_DATA_DIR}/hermes-web-ui` | Web UI data (auth token, database, uploads, logs), mapped to `/home/agent/.hermes-web-ui`. |

- Hermes data persists in `./hermes_data`.
- Web UI data persists in `./hermes_data/hermes-web-ui/`.
- Deleting `./hermes_data/hermes-web-ui/.token` and restarting generates a new
  auth token.

## Port Mapping

| Port | Description |
|---|---|
| `${PORT}` (`6060`) | Web UI dashboard and API. |
| `${XAI_OAUTH_PORT}` (`56121`, optional) | xAI OAuth callback listener when xAI login is used. |

No Hermes gateway ports are exposed by this compose setup.

## Code Runtime Behavior

- The Hermes CLI binary comes from `HERMES_BIN`
  (`packages/server/src/modules/hermes/services/runtime/cli.ts`).
- If `HERMES_BIN` is not provided, code falls back to `hermes` in `PATH`.
- Profile-specific chat runs are handled through the Hermes agent bridge. The
  selected profile is authorized per account and passed with runtime requests;
  switching the frontend Hermes profile does not restart the bridge or clear
  other running tasks.
- Docker is a managed gateway runtime: the Web UI checks profile gateways on
  startup, but does not run a periodic gateway recovery loop.
- The container health check calls `http://127.0.0.1:${PORT}/health`.

### Optional Hermes startup patches

The image starts through `/app/bin/start-studio-all.sh`. It does not apply
Hermes Agent source patches by default. If a deployment has a compatible,
optional patch script, enable it explicitly with
`HERMES_PATCH_SCRIPT=/path/to/patch.sh`. A missing or failing optional patch is
logged and the Web UI still starts, so a patch written for an older Hermes Agent
layout cannot put the container into a restart loop.

For Compose, mount the deployment-owned script and set `HERMES_PATCH_SCRIPT` in
`.env`; the Compose file passes that variable through without enabling a patch
by default.

For example, keep the script outside the image and add an override file:

```yaml
services:
  hermes-webui:
    volumes:
      - ./hermes_patches:/opt/data:ro
    environment:
      HERMES_PATCH_SCRIPT: /opt/data/apply-hermes-patches.sh
```

Patch scripts are deployment-owned and must be kept compatible with the
installed Hermes Agent version. Use the image entrypoint and
`HERMES_PATCH_SCRIPT` for optional patches; an entrypoint override that calls a
custom patch script directly is outside the image's startup contract.

## Common Operations

Recreate:

```bash
docker compose up -d --force-recreate
```

View the auth token:

```bash
docker compose logs hermes-webui | grep token
# or
cat ./hermes_data/hermes-web-ui/.token
```

Check health:

```bash
curl -fsS http://localhost:6060/health
```

Stop:

```bash
docker compose down
```
