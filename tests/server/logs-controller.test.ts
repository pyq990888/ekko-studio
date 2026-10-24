import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listLogFiles: vi.fn(async () => []),
  readLogs: vi.fn(async () => ''),
  hermesAvailable: true,
}))

vi.mock('../../packages/server/src/modules/studio/public/config', () => ({
  config: { appHome: `/tmp/hermes-web-ui-logs-controller-${process.pid}` },
}))

vi.mock('../../packages/server/src/modules/studio/public/agent-logs', () => ({
  listPrimaryAgentLogFiles: mocks.listLogFiles,
  readPrimaryAgentLogs: mocks.readLogs,
}))

vi.mock('../../packages/server/src/modules/studio/public/agent-status-registry', () => ({
  isHermesAgentAvailable: vi.fn(() => mocks.hermesAvailable),
}))

describe('Hermes logs controller', () => {
  it('does not query Hermes logs when Hermes is unavailable', async () => {
    mocks.hermesAvailable = false
    const controller = await import('../../packages/server/src/modules/studio/controllers/logs')
    const listContext: any = { state: { profile: { name: 'work' } }, query: {}, body: null }

    await controller.list(listContext)

    expect(mocks.listLogFiles).not.toHaveBeenCalled()
    expect(listContext.body.files.map((file: any) => file.name)).not.toContain('agent')

    const readContext: any = {
      params: { name: 'agent' },
      query: { lines: '100' },
      body: null,
    }
    await controller.read(readContext)

    expect(mocks.readLogs).not.toHaveBeenCalled()
    expect(readContext.body).toEqual({ entries: [] })
  })
})
