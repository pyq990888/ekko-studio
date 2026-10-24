#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { checkServerModuleBoundaries } from './server-module-boundaries.mjs'
import { hasManagedMcpNodeMode } from './managed-mcp-harness.mjs'
import { checkUiTheme } from './ui-theme-harness.mjs'

const root = process.cwd()
const failures = []
failures.push(...await checkUiTheme(root))

function fail(message) {
  failures.push(message)
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

function requireFile(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`Missing required harness file: ${relativePath}`)
  }
}

function requireDir(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`Missing required project directory: ${relativePath}`)
  }
}

for (const file of [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'DEVELOPMENT.md',
  'docs/harness/README.md',
  'docs/harness/validation.md',
  'docs/harness/worktree-runbook.md',
  'docs/harness/pr-review.md',
  'docs/harness/server-module-boundaries.md',
  'docs/harness/frontend-ui.md',
  'scripts/ui-theme-baseline.json',
]) {
  requireFile(file)
}

for (const dir of [
  'packages/client/src',
  'packages/server/src',
  'tests/client',
  'tests/server',
  'tests/e2e',
  '.github/workflows',
]) {
  requireDir(dir)
}

const agents = await readText('AGENTS.md')
const agentLines = agents.trimEnd().split(/\r?\n/)
if (agentLines.length > 120) {
  fail(`AGENTS.md should stay short; found ${agentLines.length} lines, expected <= 120`)
}

for (const requiredLink of [
  'DEVELOPMENT.md',
  'ARCHITECTURE.md',
  'docs/harness/README.md',
  'docs/harness/validation.md',
  'docs/harness/worktree-runbook.md',
  'docs/harness/pr-review.md',
]) {
  if (!agents.includes(requiredLink)) {
    fail(`AGENTS.md must link to ${requiredLink}`)
  }
}

if (!agents.includes('docs/harness/frontend-ui.md')) {
  fail('AGENTS.md must link to docs/harness/frontend-ui.md')
}

const packageJson = JSON.parse(await readText('package.json'))
for (const scriptName of [
  'harness:check',
  'test',
  'test:coverage',
  'test:e2e',
  'build',
]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json is missing script: ${scriptName}`)
  }
}

// Hermes-only WebUI must not keep desktop/Electron or coding-agent automation.
for (const forbiddenScript of [
  'build:desktop',
  'build:desktop:mac',
  'build:desktop:win',
  'build:desktop:linux',
  'desktop:dev',
  'desktop:install',
  'desktop:prepare-runtime',
  'desktop:prepare-python',
  'mcu:v1:flash:clean',
  'mcu:v2:flash:clean',
  'mcu:flash:clean',
  'test:pi-rpc-real',
  'test:workflow-live',
  'claude',
]) {
  if (packageJson.scripts?.[forbiddenScript]) {
    fail(`package.json still defines removed script: ${forbiddenScript}`)
  }
}

if (existsSync(path.join(root, 'packages/desktop'))) {
  fail('packages/desktop must be deleted; Hermes WebUI ships as a server image')
}
for (const esp32Dir of ['packages/esp32-c3', 'packages/esp32-s3']) {
  if (existsSync(path.join(root, esp32Dir))) {
    fail(`${esp32Dir} must be deleted; Hermes WebUI has no MCU firmware surface`)
  }
}

const architecture = await readText('ARCHITECTURE.md')
for (const phrase of [
  'packages/client/src',
  'packages/server/src',
  'HERMES_WEB_UI_HOME',
  'fail_on_unmatched_files: true',
]) {
  if (!architecture.includes(phrase)) {
    fail(`ARCHITECTURE.md should document: ${phrase}`)
  }
}

const buildWorkflow = await readText('.github/workflows/build.yml')
if (!buildWorkflow.includes('npm run harness:check')) {
  fail('Build workflow must run npm run harness:check')
}

for (const failure of await checkServerModuleBoundaries(root)) {
  fail(failure)
}

if (!hasManagedMcpNodeMode(
  await readText('packages/server/src/modules/hermes/services/mcp/studio-autoinject.ts'),
  'managedConfig',
)) {
  fail('modules/hermes/services/mcp/studio-autoinject.ts: managedConfig must inject ELECTRON_RUN_AS_NODE: \'1\' into every managed MCP env')
}

const webuiReleaseWorkflow = await readText('.github/workflows/webui-release.yml')
const dockerPublishWorkflow = await readText('.github/workflows/docker-publish.yml')
for (const [file, text] of [
  ['webui-release.yml', webuiReleaseWorkflow],
  ['docker-publish.yml', dockerPublishWorkflow],
]) {
  if (!text.includes('release:') || !text.includes('types: [published]')) {
    fail(`${file} must keep running on published GitHub Releases`)
  }
  if (!text.includes('gh release edit "$TAG" --repo "$GITHUB_REPOSITORY" --latest=false')) {
    fail(`${file} must keep published GitHub Releases out of latest`)
  }
}

if (!webuiReleaseWorkflow.includes('make_latest: false')) {
  fail('webui-release.yml must not mark release uploads as GitHub latest')
}

const dockerfile = await readText('Dockerfile')
for (const forbiddenPhrase of [
  'STUDIO_P2P_UDP_PORT_RANGE',
  '50000-50127/udp',
  'NPM_CONFIG_PREFIX',
]) {
  if (dockerfile.includes(forbiddenPhrase)) {
    fail(`Dockerfile must not keep removed Studio surface: ${forbiddenPhrase}`)
  }
}

if (failures.length > 0) {
  console.error('Harness check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Harness check passed')
