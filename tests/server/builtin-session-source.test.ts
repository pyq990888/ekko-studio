import { describe, expect, it } from 'vitest'
import { normalizeSessionIdentity } from '../../packages/server/src/modules/studio/contracts/history-source'

describe('legacy session source contract', () => {
  it('keeps legacy source values readable for persisted sessions', () => {
    for (const source of ['cli', 'api_server', 'coding_agent', 'builtin_agent', 'global_agent', 'workflow', 'group_chat']) {
      expect(normalizeSessionIdentity({ source }).source).toBe(source)
    }
  })

  it('maps legacy Ekko agent aliases to the builtin runtime label', () => {
    expect(normalizeSessionIdentity({ source: 'cli', agent: 'ekko' })).toEqual({ source: 'builtin_agent', agent: 'ekko-agent' })
    expect(normalizeSessionIdentity({ source: 'cli', agent: 'ekko-agent' })).toEqual({ source: 'builtin_agent', agent: 'ekko-agent' })
    expect(normalizeSessionIdentity({ source: 'cli', agent: 'ekko_agent' })).toEqual({ source: 'builtin_agent', agent: 'ekko-agent' })
  })

  it('leaves Hermes sessions untouched', () => {
    expect(normalizeSessionIdentity({ source: 'cli', agent: 'hermes' })).toEqual({ source: 'cli', agent: 'hermes' })
    expect(normalizeSessionIdentity({ source: 'api_server' })).toEqual({ source: 'api_server' })
  })

  it('preserves removed run surfaces for historical rows', () => {
    for (const source of ['group_chat', 'workflow', 'global_agent']) {
      expect(normalizeSessionIdentity({ source, agent: 'ekko_agent' }).source).toBe(source)
    }
  })
})
