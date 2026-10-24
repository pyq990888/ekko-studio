// Hermes history/model dependencies. These stay mandatory: session history,
// model context and model switching are core Hermes WebUI behavior.
import { getAvailableModelGroupsForProfile } from '../modules/hermes/controllers/models'
import { AgentBridgeClient } from '../modules/hermes/services/bridge/client'
import { getAgentBridgeManager } from '../modules/hermes/services/bridge/manager'
import {
  getExactSessionDetailFromDbWithProfile,
  getSessionDetailFromDb,
  getSessionDetailFromDbWithProfile,
  getSessionDetailPaginatedFromDbWithProfile,
  getUsageStatsFromDb,
  listSessionSummaries,
  listSessionSummaryGroups,
} from '../modules/hermes/services/history/sessions-db'
import { deleteSessionForProfile, getSession } from '../modules/hermes/services/runtime/cli'
import { getModelContextLength } from '../modules/hermes/services/models/context'
import {
  configureSessionAgentRuntime,
  type SessionAgentRuntimeDependencies,
} from '../modules/studio/public/session-agent-runtime'

/**
 * Removed coding-agent session hooks. The public session facade keeps these
 * fields total so historical `coding_agent` sessions stay readable; calling them
 * for a new run is impossible because `sockets/chat-run.ts` rejects removed
 * runtimes before dispatch.
 */
function unavailableCodingAgentSessionRuntime(): Pick<
  SessionAgentRuntimeDependencies,
  'stopCodingAgentSessionRun' | 'invalidateCodingAgentSessionRuntime'
> {
  const unavailable = () => {
    throw new Error('legacy coding agent runtime is not configured')
  }
  return {
    stopCodingAgentSessionRun: unavailable,
    invalidateCodingAgentSessionRuntime: unavailable,
  }
}

configureSessionAgentRuntime({
  ...unavailableCodingAgentSessionRuntime(),
  getAvailableModelGroups: getAvailableModelGroupsForProfile,
  deleteHermesSessionForProfile: deleteSessionForProfile,
  getHermesCliSession: getSession,
  getHermesModelContextLength: getModelContextLength,
  getHermesSessionDetail: getSessionDetailFromDb,
  getHermesSessionDetailForProfile: getSessionDetailFromDbWithProfile,
  getHermesSessionDetailPaginatedForProfile: getSessionDetailPaginatedFromDbWithProfile,
  getExactHermesSessionDetailForProfile: getExactSessionDetailFromDbWithProfile,
  getHermesUsageStats: getUsageStatsFromDb,
  listHermesSessionSummaries: listSessionSummaries,
  listHermesSessionSummaryGroups: listSessionSummaryGroups,
  notifyHermesSessionModelChanged: async (sessionId, model, provider, profile) => {
    const state = getAgentBridgeManager().getRuntimeState()
    if (!state.ready || !state.running) return
    const bridge = new AgentBridgeClient({
      endpoint: state.endpoint,
      timeoutMs: 5000,
      connectRetryMs: 0,
    })
    await bridge.switchSessionModel(
      sessionId,
      model,
      provider === 'claude-oauth' ? 'anthropic' : provider,
      profile,
    )
  },
})
