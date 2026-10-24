// Hermes bridge dependencies. This is the mandatory seam for the Hermes-only
// chat runtime; every other agent family has been removed.
import './agent-profile-adapter'
import { AgentBridgeClient } from '../modules/hermes/services/bridge/client'
import { getAgentBridgeManager } from '../modules/hermes/services/bridge/manager'
import { redactAgentBridgeError } from '../modules/hermes/services/bridge/redact'
import { projectBrowserHistory } from '../../../shared/chat-browser-history'
import {
  configureChatAgentRuntime,
  configureLegacyChatAgentRuntime,
} from '../modules/studio/public/chat-agent-runtime'

// Legacy Ekko dependencies. The Ekko removal task deletes this import block and
// the `configureLegacyChatAgentRuntime(...)` call below.
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
// current behavior; the Ekko removal task drops this call and its import block.
configureLegacyChatAgentRuntime({
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
  resolveEkkoMcpServers,
  resolveEkkoProviderRuntimeConfig,
  createEkkoAuthorizedProviderFetch,
  respondToEkkoToolApproval,
  respondToEkkoClarification,
})
