import {
  configureAgentLogs,
} from '../modules/studio/public/agent-logs'
import {
  listLogFiles,
  readLogs,
} from '../modules/hermes/services/runtime/cli'

// Hermes CLI logs are the only agent log source in the Hermes-only WebUI.
configureAgentLogs({
  listPrimaryAgentLogFiles: listLogFiles,
  readPrimaryAgentLogs: readLogs,
  getEkkoLogSource: () => null,
})
