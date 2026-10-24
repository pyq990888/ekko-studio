import type { SessionSummary } from '@/api/studio/sessions'
import type { Session } from '@/stores/hermes/chat'

type SessionAgentIdentity = { source?: string; agent?: string; codingAgentId?: string }

/** Active chat runs only accept the Hermes runtime. */
export type ActiveAgentRuntime = 'hermes'

/** Runtime values that may still exist in persisted history from before slimming. */
export type PersistedAgentRuntime =
  | 'hermes'
  | 'ekko'
  | 'ekko-agent'
  | 'claude-code'
  | 'codex'
  | 'pi'
  | 'grok'
  | 'opencode'
  | 'dsh'
  | 'cursor'
  | 'antigravity'
  | 'qwen'
  | 'kimi'
  | 'codebuddy'
  | 'qoder'
  | 'copilot'
  | 'zcode'

/** Studio surfaces removed from active chat; old rows remain readable in History. */
export const REMOVED_CHAT_SESSION_SOURCES = [
  'coding_agent',
  'builtin_agent',
  'global_agent',
  'workflow',
  'group_chat',
] as const

const REMOVED_CHAT_SESSION_SOURCE_SET = new Set<string>(REMOVED_CHAT_SESSION_SOURCES)

export function isActiveHermesSession(session?: SessionAgentIdentity | null): boolean {
  if (!session) return false
  const source = (session.source || '').trim().toLowerCase()
  if (REMOVED_CHAT_SESSION_SOURCE_SET.has(source)) return false
  if (session.codingAgentId) return false
  // Older Hermes histories omit the agent field.
  const agent = (session.agent || '').trim().toLowerCase()
  return !agent || agent === 'hermes'
}

export function isHermesSession(session?: SessionAgentIdentity | null): boolean {
  return isActiveHermesSession(session)
}

export function isBuiltinEkkoSession(session?: SessionAgentIdentity | null): boolean {
  return session?.source === 'builtin_agent' || ['ekko', 'ekko-agent', 'ekko_agent'].includes((session?.codingAgentId || session?.agent || '').trim().toLowerCase())
}

export function historySessionSource(session?: SessionAgentIdentity | null): string {
  const source = session?.source || ''
  return ['cli', 'api_server', 'coding_agent'].includes(source) && isBuiltinEkkoSession(session)
    ? 'builtin_agent'
    : source
}

// Retain legacy local runtime fields when opening old/imported sessions.
// New native runs use builtin_agent and agent_id on the wire.
export function sessionAgentFields(summary: SessionSummary): Pick<Session, 'agent' | 'agentSessionId' | 'agentNativeSessionId' | 'codingAgentId' | 'codingAgentMode'> {
  const builtin = isBuiltinEkkoSession(summary)
  const ids: Record<string, Session['codingAgentId']> = {
    claude: 'claude-code', 'claude-code': 'claude-code', claude_code: 'claude-code',
    codex: 'codex', pi: 'pi', grok: 'grok', cursor: 'cursor',
    qwen: 'qwen',
    kimi: 'kimi',
    codebuddy: 'codebuddy',
    qoder: 'qoder',
    copilot: 'copilot',
    zcode: 'zcode',
    antigravity: 'antigravity', dsh: 'dsh', opencode: 'opencode',
  }
  const providerAgent = builtin || isExternalCodingAgentSession(summary)
  return {
    agent: summary.agent || undefined,
    agentSessionId: summary.agent_session_id || undefined,
    agentNativeSessionId: summary.agent_native_session_id || undefined,
    codingAgentId: builtin ? 'ekko-agent' : ids[summary.agent || ''],
    codingAgentMode: builtin ? 'scoped' : providerAgent
      ? (summary.agent_mode === 'global' || summary.agent_mode === 'scoped'
          ? summary.agent_mode : summary.provider === 'global' ? 'global' : 'scoped')
      : undefined,
  }
}

export function isExternalCodingAgentSession(session?: SessionAgentIdentity | null): boolean {
  if (!session || isBuiltinEkkoSession(session)) return false
  return session.source === 'coding_agent' || Boolean(session.codingAgentId)
    || ['claude', 'claude-code', 'claude_code', 'codex', 'pi', 'grok', 'opencode', 'dsh', 'cursor', 'antigravity', 'qwen', 'kimi', 'codebuddy', 'qoder', 'copilot', 'zcode'].includes(session.agent || '')
}
