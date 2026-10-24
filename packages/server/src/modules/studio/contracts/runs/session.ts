import type { AgentRuntime } from '../agents/runtime'
import type { ChatMessage } from './messages'
import type { RunMode } from './surface'
import type { RunUsageSummary } from './run-usage'

export interface EkkoBackgroundContinuationContext {
  version: 1
  subagentId: string
  originRunId: string
  originStep: number
  messages: any[]
  memoryPolicy: 'disabled'
}

export interface HermesBackgroundContinuationContext {
  runtime: 'hermes'
  version: 1
  delegationId: string
  sessionId: string
  originRunId: string
  messages: ChatMessage[]
  model?: string
  provider?: string
  profile: string
  instructions?: string
  workspace?: string | null
  reasoningEffort?: string
}

export type BackgroundContinuationContext =
  | ({ runtime: 'ekko' } & EkkoBackgroundContinuationContext)
  | HermesBackgroundContinuationContext

/**
 * Content block types for Anthropic-compatible message format
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; name: string; path: string; media_type: string; context?: string; video_frame?: boolean }
  | { type: 'file'; name: string; path: string; media_type?: string; context?: string }

export interface SessionMessage {
  id: number | string
  session_id: string
  role: string
  content: string
  display_role?: string | null
  display_content?: string | null
  runMarker?: string
  run_marker?: string | null
  tool_call_id?: string | null
  tool_calls?: any[] | null
  tool_name?: string | null
  timestamp: number
  token_count?: number | null
  finish_reason?: string | null
  reasoning?: string | null
  reasoning_details?: string | null
  reasoning_content?: string | null
}

export interface QueuedRun {
  /** Internal admission check, never serialized or supplied by the client. */
  authorize?: () => Promise<void>
  queue_id: string
  input: string | ContentBlock[]
  displayInput?: string | ContentBlock[] | null
  displayRole?: 'user' | 'command'
  storageMessage?: string
  model?: string
  provider?: string
  model_groups?: Array<{ provider: string; models: string[] }>
  instructions?: string
  groupSystemPrompt?: string
  groupRoomId?: string
  groupAgentId?: string
  profile: string
  workspace?: string | null
  source?: ChatRunSource
  sessionSource?: 'global_agent' | 'group_chat'
  codingAgentId?: ChatCodingAgentId
  agentId?: ChatCodingAgentId
  mode?: RunMode
  baseUrl?: string
  base_url?: string
  apiKey?: string
  api_key?: string
  apiMode?: string
  api_mode?: string
  mcpServers?: Record<string, unknown>
  mcp_servers?: Record<string, unknown>
  oneShotModel?: boolean
  commandPassthrough?: boolean
  originSocketId?: string
  goalContinuation?: boolean
  reasoningEffort?: string
  backgroundDelegationId?: string
  backgroundClaimId?: string
  /** Internal-only origin history for a background callback. Never accepted from socket input. */
  backgroundContinuationContext?: BackgroundContinuationContext
  autonomous?: boolean
}

export interface BackgroundDelegationState {
  delegationId: string
  status: 'running' | 'delivering' | 'completed' | 'failed' | 'interrupted'
  profile?: string
  updatedAt: number
  toolCallId?: string
  messageId?: number | string
  dispatchPayload?: Record<string, unknown>
}

export type QueueInsertionRuntime = AgentRuntime
export type QueueInsertionGuarantee = 'strict' | 'immediate'
export type QueueInsertionPhase =
  | 'requesting'
  | 'waiting_for_tool_batch'
  | 'stopping_current_turn'
  | 'starting_queued_message'

export interface QueueInsertionControl {
  generation: string
  queueId: string
  runId?: string
  runtime: QueueInsertionRuntime
  phase: QueueInsertionPhase
  guarantee: QueueInsertionGuarantee
  requestedAt: number
}

export interface SessionState {
  /** Manual Hermes compression also holds history against message deletion. */
  isCompressing?: boolean
  /** Explicit Stop suppresses automatic wakeups until the next user run. */
  backgroundWakeStopped?: boolean
  /** Snapshot the owning runtime's interrupted turn without waiting for model IO. */
  finalizeRunUsage?: () => RunUsageSummary | undefined
  nativeUsageSource?: 'coding_agent'
  messages: SessionMessage[]
  messageTotal?: number
  messageLoadedCount?: number
  messagePageLimit?: number
  messageStateBaselineCount?: number
  hasMoreBefore?: boolean
  isWorking: boolean
  /**
   * When the current run began, so a client that joins late shows how long
   * the agent has really been working rather than counting from its own
   * first render.
   */
  runStartedAt?: number
  events: Array<{ event: string; data: any }>
  abortController?: AbortController
  runId?: string
  activeRunMarker?: string
  /** Generation owned by a live Hermes output consumer, including finalization. */
  bridgeRunPollMarker?: string
  profile?: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  contextTokens?: number
  /** Ekko's system/tool context, kept separately from conversation history. */
  ekkoContext?: { fixedContextTokens: number }
  bridgeContext?: BridgeContextState
  isAborting?: boolean
  queue: QueuedRun[]
  queueInsertion?: QueueInsertionControl
  responseRun?: ResponseRunState
  source?: ChatRunSource
  webhookAgent?: 'bridge' | 'ekko' | 'claude-code' | 'codex' | 'pi' | 'grok' | 'opencode' | 'dsh' | 'cursor' | 'antigravity' | 'qwen' | 'kimi' | 'codebuddy' | 'qoder' | 'copilot' | 'zcode'
  webhookRoomId?: string
  bridgePendingAssistantContent?: string
  bridgeAssistantMessageId?: string
  bridgePendingReasoningContent?: string
  bridgePendingToolCallMarkup?: string
  bridgeOutput?: string
  bridgeToolCounter?: number
  bridgePendingTools?: Array<{
    id: string
    name: string
    arguments: string
    startedAt: number
  }>
  bridgeCompressionResults?: Record<string, BridgeCompressionResult>
  backgroundTasks?: Record<string, Record<string, unknown>>
  backgroundDelegations?: Record<string, BackgroundDelegationState>
  /** Process-local by design; callbacks after a Studio restart are rejected instead of using live history. */
  backgroundContinuationContexts?: Record<string, BackgroundContinuationContext>
}

export interface ResponseRunState {
  runMarker?: string
  responseId?: string
  reasoningMessageId?: number | string
  pendingReasoning?: string
  toolBoundaryReasoning?: string
  toolReasoning?: Map<string, string>
  insertedKeys: Set<string>
  toolCalls: Map<string, any>
}

export interface BridgeContextState {
  fixedContextTokens?: number
  systemPromptTokens?: number
  toolTokens?: number
  systemPromptChars?: number
  toolCount?: number
  toolNames?: string[]
  profile?: string
  model?: string
  provider?: string
  workspace?: string
}

export type ChatRunSource = 'api_server' | 'cli' | 'coding_agent' | 'builtin_agent' | 'global_agent' | 'workflow' | 'group_chat'
export type ChatCodingAgentId = 'claude-code' | 'codex' | 'pi' | 'grok' | 'opencode' | 'dsh' | 'cursor' | 'antigravity' | 'qwen' | 'kimi' | 'codebuddy' | 'qoder' | 'copilot' | 'zcode' | 'ekko-agent'

/** Session sources that remain readable but can no longer start new runs. */
export const LEGACY_SESSION_SOURCES = ['coding_agent', 'builtin_agent', 'global_agent', 'workflow', 'group_chat'] as const
export type LegacySessionSource = Extract<ChatRunSource, typeof LEGACY_SESSION_SOURCES[number]>
const LEGACY_SESSION_SOURCE_SET = new Set<string>(LEGACY_SESSION_SOURCES)

export function isLegacySessionSource(source: unknown): source is LegacySessionSource {
  return typeof source === 'string' && LEGACY_SESSION_SOURCE_SET.has(source)
}

export const LEGACY_SESSION_HTTP_STATUS = 410

/** Shared rejection for write attempts on a readable legacy session. */
export class LegacySessionError extends Error {
  readonly status = LEGACY_SESSION_HTTP_STATUS
  readonly code = 'legacy_session_read_only'

  constructor(message = 'This session belongs to a removed runtime and is read-only') {
    super(message)
    this.name = 'LegacySessionError'
  }
}

export interface BridgeCompressionResult {
  messages: ChatMessage[]
  beforeMessages: number
  resultMessages: number
  beforeTokens: number
  afterTokens: number
  compressed: boolean
  llmCompressed: boolean
  summaryTokens: number
  verbatimCount: number
  compressedStartIndex: number
}
