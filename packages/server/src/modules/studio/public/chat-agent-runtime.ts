export type PrimaryAgentBridgeClient = Record<string, any>
export type PrimaryAgentBridgeContextEstimate = any
export type PrimaryAgentBridgeMessage = any
export type PrimaryAgentBridgeOutput = any
export type PrimaryAgentBridgeRunResult = any
export type ChatAgentMessage = any
export type ChatAgentClarificationRequest = any
export type ChatAgentOutputMessage = any
export type ChatAgentToolCall = any
export type ChatAgentToolApprovalRequest = any
export type ChatAgentToolResult = any
export type ChatModelClient = any
export type ChatModelEvent = any
export type ChatAgentRuntimeEvent = any
export type ChatModelProviderConfig = any
export type ChatModelReasoningEffort = any
export type ChatModelRequest = any
export type ChatModelResponse = any

/**
 * Thread projection used by Hermes bridge history assembly.
 */
export interface ChatAgentRuntimeHermesDependencies {
  projectBrowserHistory<T extends { role: string; content: unknown; name?: string | null; tool_name?: string | null }>(messages: T[], options?: { truncateOtherTools?: (content: string) => string }): T[]
  createPrimaryAgentBridge(options?: Record<string, unknown>): PrimaryAgentBridgeClient
  getPrimaryAgentBridgeManager(): any
  redactPrimaryAgentBridgeError(error: string | undefined, endpoint?: string, replacement?: string): string | undefined
}

/**
 * Legacy Ekko/coding-agent dependencies.
 *
 * These are optional on purpose: the Hermes-only chat runtime must start without
 * them. Phase 2 removes the legacy registrations and these wrappers together.
 */
export interface ChatAgentRuntimeLegacyDependencies {
  codingAgentRunManager?: Record<string, any>
  sendCodingAgentRunInput?: (...args: any[]) => any
  startCodingAgentRun?: (...args: any[]) => any
  handleCodingAgentSessionCommand?: (...args: any[]) => Promise<any>
  parseCodingAgentSessionCommand?: (...args: any[]) => any
  getEkkoAgent?: (profile: string) => any
  abortEkkoBackgroundTasks?: (...args: any[]) => Promise<any>
  hasEkkoBackgroundTasks?: (...args: any[]) => boolean
  createEkkoModelClient?: (...args: any[]) => any
  resolveEkkoModelProviderConfigs?: (...args: any[]) => any
  ekkoModelRequestTimeoutMs?: number
  ekkoAgentReasoningText?: (...args: any[]) => string
  normalizeEkkoAgentReasoning?: (...args: any[]) => any
  serializeEkkoAgentReasoningDetails?: (...args: any[]) => any
  waitForEkkoToolApproval?: (...args: any[]) => Promise<any>
  waitForEkkoClarification?: (...args: any[]) => Promise<any>
  getCodingAgentMcpServers?: (id: string, profile: string) => Record<string, unknown>
  resolveEkkoMcpServers?: (...args: any[]) => any
  resolveEkkoProviderRuntimeConfig?: (...args: any[]) => Promise<any>
  createEkkoAuthorizedProviderFetch?: (...args: any[]) => any
  respondToEkkoToolApproval?: (...args: any[]) => any
  respondToEkkoClarification?: (...args: any[]) => any
}

/**
 * Compatibility view of the full runtime surface. Hermes bridge fields are
 * required; legacy Ekko/coding fields stay optional until Phase 2 deletes them.
 */
export interface ChatAgentRuntimeDependencies extends ChatAgentRuntimeHermesDependencies, ChatAgentRuntimeLegacyDependencies {}

let hermesDependencies: ChatAgentRuntimeHermesDependencies | null = null
let legacyDependencies: ChatAgentRuntimeLegacyDependencies = {}

export function projectChatBrowserHistory<T extends { role: string; content: unknown; name?: string | null; tool_name?: string | null }>(messages: T[], options?: { truncateOtherTools?: (content: string) => string }): T[] {
  return configured().projectBrowserHistory(messages, options)
}

/** Mandatory Hermes bridge seam; bootstrap always supplies these dependencies. */
export function configureChatAgentRuntime(next: ChatAgentRuntimeHermesDependencies): void {
  hermesDependencies = next
}

/** Optional legacy seam; Phase 2 drops this registration entirely. */
export function configureLegacyChatAgentRuntime(next: ChatAgentRuntimeLegacyDependencies): void {
  legacyDependencies = next
}

function configured(): ChatAgentRuntimeHermesDependencies {
  if (!hermesDependencies) throw new Error('Studio chat Agent runtime has not been configured')
  return hermesDependencies
}

function legacyDependency<K extends keyof ChatAgentRuntimeLegacyDependencies>(
  name: K,
): NonNullable<ChatAgentRuntimeLegacyDependencies[K]> {
  const value = legacyDependencies[name]
  if (value === undefined) throw new Error('legacy chat agent runtime is not configured')
  return value as NonNullable<ChatAgentRuntimeLegacyDependencies[K]>
}

export const createPrimaryAgentBridge = (options?: Record<string, unknown>) => (
  configured().createPrimaryAgentBridge(options)
)
export const getPrimaryAgentBridgeManager = () => configured().getPrimaryAgentBridgeManager()
export const redactPrimaryAgentBridgeError = (
  error: string | undefined,
  endpoint?: string,
  replacement?: string,
) => configured().redactPrimaryAgentBridgeError(error, endpoint, replacement)

export const chatCodingAgentRunManager = {
  hasSession: (...args: any[]) => legacyDependency('codingAgentRunManager').hasSession(...args),
  stop: (...args: any[]) => legacyDependency('codingAgentRunManager').stop(...args),
  isSessionLaunchCompatible: (...args: any[]) => legacyDependency('codingAgentRunManager').isSessionLaunchCompatible(...args),
  isSessionProcessing: (...args: any[]) => legacyDependency('codingAgentRunManager').isSessionProcessing(...args),
  runIdForSession: (...args: any[]) => legacyDependency('codingAgentRunManager').runIdForSession(...args),
  interruptForQueueInsertion: (...args: any[]) => legacyDependency('codingAgentRunManager').interruptForQueueInsertion(...args),
  resolveApproval: (...args: any[]) => legacyDependency('codingAgentRunManager').resolveApproval(...args),
  resolveClarification: (...args: any[]) => legacyDependency('codingAgentRunManager').resolveClarification(...args),
}

export const sendChatCodingAgentRunInput = (...args: any[]) => legacyDependency('sendCodingAgentRunInput')(...args)
export const startChatCodingAgentRun = (...args: any[]) => legacyDependency('startCodingAgentRun')(...args)
export const handleChatCodingAgentSessionCommand = (...args: any[]) => legacyDependency('handleCodingAgentSessionCommand')(...args)
export const parseChatCodingAgentSessionCommand = (...args: any[]) => legacyDependency('parseCodingAgentSessionCommand')(...args)

export const getChatEkkoAgent = (profile: string) => legacyDependency('getEkkoAgent')(profile)
export const abortChatEkkoBackgroundTasks = (...args: any[]) => legacyDependency('abortEkkoBackgroundTasks')(...args)
export const hasChatEkkoBackgroundTasks = (...args: any[]) => legacyDependency('hasEkkoBackgroundTasks')(...args)
export const createChatEkkoModelClient = (...args: any[]) => legacyDependency('createEkkoModelClient')(...args)
export const resolveChatEkkoModelProviderConfigs = (...args: any[]) => legacyDependency('resolveEkkoModelProviderConfigs')(...args)
export const getChatEkkoModelRequestTimeoutMs = () => legacyDependency('ekkoModelRequestTimeoutMs')
export const chatEkkoAgentReasoningText = (...args: any[]) => legacyDependency('ekkoAgentReasoningText')(...args)
export const normalizeChatEkkoAgentReasoning = (...args: any[]) => legacyDependency('normalizeEkkoAgentReasoning')(...args)
export const serializeChatEkkoAgentReasoningDetails = (...args: any[]) => legacyDependency('serializeEkkoAgentReasoningDetails')(...args)
export const waitForChatEkkoToolApproval = (...args: any[]) => legacyDependency('waitForEkkoToolApproval')(...args)
export const waitForChatEkkoClarification = (...args: any[]) => legacyDependency('waitForEkkoClarification')(...args)
export const resolveChatEkkoMcpServers = (...args: any[]) => legacyDependency('resolveEkkoMcpServers')(...args)
export const resolveChatEkkoProviderRuntimeConfig = (...args: any[]) => legacyDependency('resolveEkkoProviderRuntimeConfig')(...args)
export const createChatEkkoAuthorizedProviderFetch = (...args: any[]) => legacyDependency('createEkkoAuthorizedProviderFetch')(...args)
export const respondToChatEkkoToolApproval = (...args: any[]) => legacyDependency('respondToEkkoToolApproval')(...args)
export const respondToChatEkkoClarification = (...args: any[]) => legacyDependency('respondToEkkoClarification')(...args)

export const getChatCodingAgentMcpServers = (id: string, profile: string) => legacyDependency('getCodingAgentMcpServers')(id, profile)
