import { describe, expect, it } from 'vitest'
import {
  AGENT_FAMILIES,
  AGENT_RUNTIMES,
  ACTIVE_AGENT_RUNTIMES,
  RUN_MODES,
  RUN_SURFACES,
  agentFamilyForRuntime,
  isActiveAgentRuntime,
  isAgentFamily,
  isAgentRuntime,
  isPersistedAgentRuntime,
  isRunMode,
  isRunSurface,
} from '../../packages/server/src/modules/studio'

describe('Studio agent contracts', () => {
  it('keeps families distinct from the persisted runtime union', () => {
    expect(AGENT_FAMILIES).toEqual(['hermes', 'ekko', 'coding'])
    // The persisted union still contains removed runtimes so historical
    // `sessions.agent` rows keep resolving. Only Hermes may start new runs.
    expect(AGENT_RUNTIMES).toContain('hermes')
    expect(AGENT_RUNTIMES).toContain('ekko')
    expect(ACTIVE_AGENT_RUNTIMES).toEqual(['hermes'])
    expect(AGENT_RUNTIMES.map(agentFamilyForRuntime)).toContain('coding')
  })

  it('validates canonical values without accepting legacy aliases', () => {
    expect(isAgentFamily('coding')).toBe(true)
    expect(isAgentRuntime('claude-code')).toBe(true)
    expect(isAgentRuntime('grok')).toBe(true)
    expect(isAgentRuntime('cursor')).toBe(true)
    expect(isAgentRuntime('claude')).toBe(false)
    expect(isAgentRuntime('ekko-agent')).toBe(false)
  })

  it('gates new runs to the active runtime while old rows stay readable', () => {
    expect(isActiveAgentRuntime('hermes')).toBe(true)
    expect(isActiveAgentRuntime('ekko')).toBe(false)
    expect(isActiveAgentRuntime('claude-code')).toBe(false)
    expect(isPersistedAgentRuntime('ekko')).toBe(true)
    expect(isPersistedAgentRuntime('claude-code')).toBe(true)
    expect(isPersistedAgentRuntime('claude')).toBe(false)
  })

  it('keeps launch surface and mode independent from runtime', () => {
    expect(RUN_SURFACES).toContain('chat')
    expect(RUN_MODES).toEqual(['scoped', 'global'])
    // Removed surfaces stay readable in the union for persisted rows.
    expect(RUN_SURFACES).toContain('group-chat')
    expect(RUN_SURFACES).toContain('global-agent')
    expect(isRunSurface('workflow')).toBe(false)
    expect(isRunSurface('coding_agent')).toBe(false)
    expect(isRunMode('global')).toBe(true)
  })
})
