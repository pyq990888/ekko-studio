// Hermes bridge dependencies. This is the mandatory seam for the Hermes-only
// chat runtime; every other agent family has been removed.
import './agent-profile-adapter'
import { AgentBridgeClient } from '../modules/hermes/services/bridge/client'
import { getAgentBridgeManager } from '../modules/hermes/services/bridge/manager'
import { redactAgentBridgeError } from '../modules/hermes/services/bridge/redact'
import { projectBrowserHistory } from '../../../shared/chat-browser-history'
import { configureChatAgentRuntime } from '../modules/studio/public/chat-agent-runtime'

// Hermes-only seam: always configured before the server starts listening.
configureChatAgentRuntime({
  projectBrowserHistory,
  createPrimaryAgentBridge: options => new AgentBridgeClient(options),
  getPrimaryAgentBridgeManager: getAgentBridgeManager,
  redactPrimaryAgentBridgeError: redactAgentBridgeError,
})
