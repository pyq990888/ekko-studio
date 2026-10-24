# Hermes-only baseline (pre-slim)

Recorded on `refactor/hermes-only` from `main` @ `372d9b88`
(`pre-hermes-only-v0.7.39` tag). This is the comparison point for the
slimming work.

## Environment

- Node: v24.21.0 (bundled runtime; repo engines require >=23)
- npm: 10.9.7
- `npm ci --ignore-scripts`: 901 packages in 29s
- `npm rebuild node-pty`: required after install for local terminal tests
- `npm run build`: passes

## Build output

- OpenAPI: 443 endpoints / 57 tags
- Vite: 7,335 modules transformed in 8.74s
- Server bundle: `dist/server/index.js` 12.7 MB (sourcemap 34.6 MB)
- Generated assets include `dist/ekko-skills` and `dist/mcu` (removed later)
- Largest client chunks: editor API ~3.7 MB, index ~1.16 MB, pptx ~1.0 MB,
  highlight ~967 KB, markdown renderer ~660 KB, PDF ~473 KB

## Known issues

- Local environment default Node is v22; use the bundled Node 24 path for
  builds/tests.
- `npm ci` emits an EBADENGINE warning for Node 22; install still succeeds.
- `docs/harness/server-module-boundaries.md` target tree drifts from the actual
  implementation (see audit reports); treat actual directories as source of
  truth.
- `scripts/harness-check.mjs` hard-requires desktop/coding packages and must be
  trimmed together with their deletion.

## Feature counts at baseline

- Server: 733 TS files / 132,843 LOC
- Client: 477 source files / 174,070 LOC (including ~2.54 MB of locale files)
- Root lockfile: 1,038 packages
- Tests: 1,047 files
- CI workflows: 15
- Client routes: 50 records

## Post-slim targets

- Server: ~260-300 files / 52-56k LOC
- Client: ~368 files / 123k LOC without voice
- Lockfile: ~883 packages
- Tests: ~614 files
- CI: 6 workflows
