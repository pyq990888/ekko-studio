import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join, resolve } from 'node:path'

const mocks = vi.hoisted(() => ({ exec: vi.fn(), read: vi.fn(), pack: vi.fn() }))
vi.mock('node:child_process', () => ({ execFileSync: mocks.exec }))
vi.mock('node:fs', () => ({ readFileSync: mocks.read }))
vi.mock('../../scripts/pack-npm-releases.mjs', () => ({ packNpmReleases: mocks.pack }))

import { parsePublishOptions, publishNpmReleases } from '../../scripts/publish-npm-releases.mjs'

const root = resolve('fixture repo with spaces')
const npmCli = resolve('fixture node/npm-cli.js')
const packages = [{ name: 'hermes-web-ui', version: '1.0.0', filename: 'hermes-web-ui-1.0.0.tgz' }]

beforeEach(() => {
  vi.resetAllMocks()
  mocks.read.mockReturnValue(JSON.stringify({ name: 'hermes-web-ui', version: '1.0.0' }))
  mocks.pack.mockReturnValue(packages)
})

describe('local npm publishing', () => {
  it('builds once and publishes the verified tarball with argument arrays', () => {
    publishNpmReleases(root, parsePublishOptions([]), npmCli)
    expect(mocks.exec).toHaveBeenNthCalledWith(1, process.execPath, [npmCli, 'run', 'build'], { cwd: root, stdio: 'inherit' })
    expect(mocks.pack).toHaveBeenCalledWith(root, join(root, 'release/npm'), npmCli)
    expect(mocks.exec).toHaveBeenNthCalledWith(2, process.execPath,
      [npmCli, 'publish', join(root, 'release/npm/hermes-web-ui-1.0.0.tgz'), '--access', 'public', '--tag', 'latest',
        '--ignore-scripts', '--registry', 'https://registry.npmjs.org'], { cwd: root, stdio: 'inherit' })
  })

  it('builds and packs in dry-run mode without executing npm publish', () => {
    publishNpmReleases(root, parsePublishOptions(['--dry-run']), npmCli)
    expect(mocks.exec).toHaveBeenCalledTimes(1)
    expect(mocks.pack).toHaveBeenCalledOnce()
  })

  it('defaults prereleases to next and accepts an explicit dist-tag', () => {
    mocks.read.mockReturnValue(JSON.stringify({ name: 'hermes-web-ui', version: '1.0.0-beta.1' }))
    publishNpmReleases(root, parsePublishOptions([]), npmCli)
    expect(mocks.exec.mock.calls[1][1]).toContain('next')
    mocks.exec.mockClear()
    publishNpmReleases(root, parsePublishOptions(['--tag', 'beta']), npmCli)
    expect(mocks.exec.mock.calls[1][1]).toContain('beta')
  })

  it('does not pack or publish when the build fails', () => {
    mocks.exec.mockImplementationOnce(() => { throw new Error('build failed') })
    expect(() => publishNpmReleases(root, parsePublishOptions([]), npmCli)).toThrow('build failed')
    expect(mocks.pack).not.toHaveBeenCalled()
    expect(mocks.exec).toHaveBeenCalledTimes(1)
  })

  it('rejects a source manifest that is not the public package', () => {
    mocks.read.mockReturnValue(JSON.stringify({ name: 'other-package', version: '1.0.0' }))
    expect(() => publishNpmReleases(root, parsePublishOptions([]), npmCli)).toThrow('Expected the public hermes-web-ui source package')
    expect(mocks.exec).not.toHaveBeenCalled()
  })

  it.each([['--unknown'], ['--package'], ['--package', 'other-package'], ['--tag'], ['--tag', '--dry-run']])('rejects invalid options %j', (...args) => {
    expect(() => parsePublishOptions(args)).toThrow()
    expect(mocks.exec).not.toHaveBeenCalled()
  })
})
