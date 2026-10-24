import type { AgentFamily } from './family'

export const AGENT_RUNTIMES = ['hermes', 'ekko', 'claude-code', 'codex', 'pi', 'grok', 'opencode', 'dsh', 'cursor', 'antigravity', 'qwen', 'kimi', 'codebuddy', 'qoder', 'copilot', 'zcode'] as const

/** Runtimes that may start new runs in the Hermes-only Studio. */
export const ACTIVE_AGENT_RUNTIMES = ['hermes'] as const

export type AgentRuntime = typeof AGENT_RUNTIMES[number]
/** Runtime identity that may be selected for a new run. */
export type ActiveAgentRuntime = typeof ACTIVE_AGENT_RUNTIMES[number]
/** Existing sessions may still carry a runtime that is no longer active. */
export type PersistedAgentRuntime = AgentRuntime
export type CodingAgentRuntime = Extract<AgentRuntime, 'claude-code' | 'codex' | 'pi' | 'grok' | 'opencode' | 'dsh' | 'cursor' | 'antigravity' | 'qwen' | 'kimi' | 'codebuddy' | 'qoder' | 'copilot' | 'zcode'>

const AGENT_RUNTIME_SET = new Set<string>(AGENT_RUNTIMES)
const ACTIVE_AGENT_RUNTIME_SET = new Set<string>(ACTIVE_AGENT_RUNTIMES)

const RUNTIME_FAMILIES: Record<AgentRuntime, AgentFamily> = {
  hermes: 'hermes',
  ekko: 'ekko',
  'claude-code': 'coding',
  codex: 'coding',
  pi: 'coding',
  grok: 'coding',
  opencode: 'coding',
  dsh: 'coding',
  cursor: 'coding',
  antigravity: 'coding',
  qwen: 'coding',
  kimi: 'coding',
  codebuddy: 'coding',
  qoder: 'coding',
  copilot: 'coding',
  zcode: 'coding',

}

export function isAgentRuntime(value: unknown): value is AgentRuntime {
  return typeof value === 'string' && AGENT_RUNTIME_SET.has(value)
}

/** True only for runtimes that may create new runs. */
export function isActiveAgentRuntime(value: unknown): value is ActiveAgentRuntime {
  return typeof value === 'string' && ACTIVE_AGENT_RUNTIME_SET.has(value)
}

/** True for every runtime value that may exist in persisted session data. */
export function isPersistedAgentRuntime(value: unknown): value is PersistedAgentRuntime {
  return isAgentRuntime(value)
}

export function agentFamilyForRuntime(runtime: AgentRuntime): AgentFamily {
  return RUNTIME_FAMILIES[runtime]
}
