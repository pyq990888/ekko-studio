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

// Legacy coding-agent hooks. Phase 2 deletes this import block and the
// `resolveCodingAgentSessionRuntime()` seam below.
import { codingAgentRunManager } from '../modules/coding-agents/services/runtime/run-manager'
import { getCodingAgentModels } from '../modules/coding-agents/services'
import { validateNativeModelEffort } from '../modules/coding-agents/services/models/variants'

type CodingAgentSessionRuntimeDependencies = Pick<
  SessionAgentRuntimeDependencies,
  'stopCodingAgentSessionRun' | 'invalidateCodingAgentSessionRuntime' | 'validateCodingAgentModelEffort'
>

/**
 * Optional legacy seam: return the coding-agent session hooks only when the
 * coding-agent runtime is present. Hermes history/model behavior never calls
 * into this object.
 */
function resolveCodingAgentSessionRuntime(): CodingAgentSessionRuntimeDependencies | null {
  if (typeof codingAgentRunManager?.stop !== 'function') return null
  if (typeof getCodingAgentModels !== 'function' || typeof validateNativeModelEffort !== 'function') return null

  return {
    stopCodingAgentSessionRun: (sessionId, options) => codingAgentRunManager.stop(sessionId, options),
    invalidateCodingAgentSessionRuntime: (sessionId, agentId = 'grok') => codingAgentRunManager.invalidateMatching(
      launch => launch.sessionId === sessionId && launch.agentId === agentId,
    ),
    validateCodingAgentModelEffort: async (agent, currentModel, nextModel, effort) => {
      const result = await getCodingAgentModels({ agent })
      const catalog = result.agents.find(entry => entry.agentId === agent)
      if (catalog?.status !== 'ready') throw Object.assign(new Error('Native model catalog unavailable'), { status: 503 })
      validateNativeModelEffort(catalog.models, currentModel, nextModel, effort)
    },
  }
}

/**
 * Transitional stubs keep the public session facade total while the coding
 * runtime is absent. Phase 2 removes the coding fields and these stubs.
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

const codingAgentSessionRuntime = resolveCodingAgentSessionRuntime()

configureSessionAgentRuntime({
  ...(codingAgentSessionRuntime ?? unavailableCodingAgentSessionRuntime()),
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
