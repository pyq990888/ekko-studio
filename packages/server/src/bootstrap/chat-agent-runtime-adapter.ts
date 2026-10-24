// Hermes bridge dependencies. This import block is the mandatory seam for the
// Hermes-only chat runtime; `projectBrowserHistory` is still hosted by
// ekko-agent until Phase 2 replaces that implementation.
import './agent-profile-adapter'
import { AgentBridgeClient } from '../modules/hermes/services/bridge/client'
import { getAgentBridgeManager } from '../modules/hermes/services/bridge/manager'
import { redactAgentBridgeError } from '../modules/hermes/services/bridge/redact'
import { projectBrowserHistory } from '../../../ekko-agent/src'
import {
  configureChatAgentRuntime,
  configureLegacyChatAgentRuntime,
} from '../modules/studio/public/chat-agent-runtime'

// Legacy Ekko/coding-agent dependencies. Phase 2 deletes this import block and
// the `configureLegacyChatAgentRuntime(...)` call at the bottom of this file.
import { getCodingAgentManagedMcpServerConfigs, type CodingAgentId } from '../modules/coding-agents/services'
import { codingAgentRunManager } from '../modules/coding-agents/services/runtime/run-manager'
import { sendCodingAgentRunInput, startCodingAgentRun } from '../modules/coding-agents'
import {
  handleCodingAgentSessionCommand,
  parseCodingAgentSessionCommand,
} from '../modules/coding-agents/services/session-command'
import {
  abortGlobalEkkoBackgroundTasks,
  getGlobalEkkoAgent,
  hasGlobalEkkoBackgroundTasks,
} from '../modules/ekko/services/manager'
import { respondToEkkoToolApproval, waitForEkkoToolApproval } from '../modules/ekko/services/approvals'
import { respondToEkkoClarification, waitForEkkoClarification } from '../modules/ekko/services/clarifications'
import { resolveEkkoMcpServers } from '../modules/ekko/services/mcp'
import {
  createEkkoAuthorizedProviderFetch,
  resolveEkkoProviderRuntimeConfig,
} from '../modules/ekko/services/provider-runtime'
import {
  agentReasoningText,
  createModelClient,
  DEFAULT_MODEL_REQUEST_TIMEOUT_MS,
  normalizeAgentReasoning,
  resolveModelProviderConfigs,
  serializeAgentReasoningDetails,
} from '../../../ekko-agent/src'

// Hermes-only seam: always configured before the server starts listening.
configureChatAgentRuntime({
  projectBrowserHistory,
  createPrimaryAgentBridge: options => new AgentBridgeClient(options),
  getPrimaryAgentBridgeManager: getAgentBridgeManager,
  redactPrimaryAgentBridgeError: redactAgentBridgeError,
})

// Legacy seam: Hermes chat does not require any of these. Kept registered for
// current behavior; Phase 2 drops this call and the import block above.
configureLegacyChatAgentRuntime({
  codingAgentRunManager,
  sendCodingAgentRunInput,
  startCodingAgentRun,
  handleCodingAgentSessionCommand,
  parseCodingAgentSessionCommand,
  getEkkoAgent: getGlobalEkkoAgent,
  abortEkkoBackgroundTasks: abortGlobalEkkoBackgroundTasks,
  hasEkkoBackgroundTasks: hasGlobalEkkoBackgroundTasks,
  createEkkoModelClient: createModelClient,
  resolveEkkoModelProviderConfigs: resolveModelProviderConfigs,
  ekkoModelRequestTimeoutMs: DEFAULT_MODEL_REQUEST_TIMEOUT_MS,
  ekkoAgentReasoningText: agentReasoningText,
  normalizeEkkoAgentReasoning: normalizeAgentReasoning,
  serializeEkkoAgentReasoningDetails: serializeAgentReasoningDetails,
  waitForEkkoToolApproval,
  waitForEkkoClarification,
  getCodingAgentMcpServers: (id, profile) => getCodingAgentManagedMcpServerConfigs(id as CodingAgentId, profile),
  resolveEkkoMcpServers,
  resolveEkkoProviderRuntimeConfig,
  createEkkoAuthorizedProviderFetch,
  respondToEkkoToolApproval,
  respondToEkkoClarification,
})
