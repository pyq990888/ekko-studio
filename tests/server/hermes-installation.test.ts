import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveHermesInstallationEnvironment } from '../../packages/server/src/modules/hermes/services/runtime/installation'

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })))

function sandbox(): string {
  const root = mkdtempSync(join(tmpdir(), 'hermes-installation-'))
  dirs.push(root)
  return root
}

describe('Hermes installation environment resolution', () => {
  it('resolves a quoted absolute python interpreter from a shell launcher', () => {
    const root = sandbox()
    const python = join(root, 'tools', 'python-3.14', 'bin', 'python3')
    mkdirSync(join(root, 'tools', 'python-3.14', 'bin'), { recursive: true })
    writeFileSync(python, '')
    chmodSync(python, 0o755)
    mkdirSync(join(root, 'hermes-agent'), { recursive: true })
    writeFileSync(join(root, 'hermes-agent', 'run_agent.py'), '')

    const launcher = join(root, 'bin', 'hermes')
    mkdirSync(join(root, 'bin'), { recursive: true })
    writeFileSync(launcher, `#!/bin/sh\nexec "${python}" -I -c 'print(1)'\n`)
    chmodSync(launcher, 0o755)

    const env = resolveHermesInstallationEnvironment(launcher, root, { PATH: '' })
    expect(env.python).toBe(python)
    expect(env.agentRoot).toBe(join(root, 'hermes-agent'))
  })

  it('resolves a bare absolute python interpreter after exec', () => {
    const root = sandbox()
    const python = join(root, 'tools', 'python-3.14.7+20260901-linux-x64', 'bin', 'python3')
    mkdirSync(join(root, 'tools', 'python-3.14.7+20260901-linux-x64', 'bin'), { recursive: true })
    writeFileSync(python, '')
    chmodSync(python, 0o755)
    mkdirSync(join(root, 'hermes-agent'), { recursive: true })
    writeFileSync(join(root, 'hermes-agent', 'run_agent.py'), '')

    const launcher = join(root, 'bin', 'hermes')
    mkdirSync(join(root, 'bin'), { recursive: true })
    // The upstream installer writes the interpreter without quotes.
    writeFileSync(launcher, `#!/bin/sh\nexec ${python} -I -c 'import sys'\n`)
    chmodSync(launcher, 0o755)

    const env = resolveHermesInstallationEnvironment(launcher, root, { PATH: '' })
    expect(env.python).toBe(python)
    expect(env.agentRoot).toBe(join(root, 'hermes-agent'))
  })

  it('follows a wrapper chain to the real python interpreter', () => {
    const root = sandbox()
    const python = join(root, 'tools', 'python-3.14.7+20260901-linux-x64', 'bin', 'python3')
    mkdirSync(join(root, 'tools', 'python-3.14.7+20260901-linux-x64', 'bin'), { recursive: true })
    writeFileSync(python, '')
    chmodSync(python, 0o755)
    mkdirSync(join(root, 'hermes-agent'), { recursive: true })
    writeFileSync(join(root, 'hermes-agent', 'run_agent.py'), '')

    // Real install: `~/.local/bin/hermes` -> `<install>/.hermes/bin/hermes` -> python.
    const inner = join(root, 'hermes-agent', '.hermes', 'bin', 'hermes')
    mkdirSync(join(root, 'hermes-agent', '.hermes', 'bin'), { recursive: true })
    writeFileSync(inner, `#!/bin/sh\nexec ${python} -I -c 'import sys'\n`)
    chmodSync(inner, 0o755)

    const outer = join(root, 'local', 'bin', 'hermes')
    mkdirSync(join(root, 'local', 'bin'), { recursive: true })
    writeFileSync(outer, `#!/bin/sh\nexec ${inner} "$@"\n`)
    chmodSync(outer, 0o755)

    const env = resolveHermesInstallationEnvironment(outer, root, { PATH: '' })
    expect(env.python).toBe(python)
    expect(env.agentRoot).toBe(join(root, 'hermes-agent'))
  })

  it('returns no python when the launcher target does not exist', () => {
    const root = sandbox()
    const launcher = join(root, 'bin', 'hermes')
    mkdirSync(join(root, 'bin'), { recursive: true })
    writeFileSync(launcher, `#!/bin/sh\nexec ${join(root, 'missing', 'python3')} -I -c 'x'\n`)
    chmodSync(launcher, 0o755)

    const env = resolveHermesInstallationEnvironment(launcher, root, { PATH: '' })
    expect(env.python).toBeUndefined()
  })
})
