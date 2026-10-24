import { existsSync } from 'fs'
import { join } from 'path'
import { config } from '../modules/studio/public/config'
import {
  configureAgentLogs,
  type StructuredAgentLogSource,
} from '../modules/studio/public/agent-logs'
import {
  listLogFiles,
  readLogs,
} from '../modules/hermes/services/runtime/cli'

// Legacy Ekko log reader. Phase 2 deletes this import block, the optional
// registrar below, and the `getEkkoLogSource` entry in the dependency object.
import {
  EKKO_LOG_FILE_NAME,
  EkkoDirectoryManager,
  EkkoFileLogReader,
} from '../../../ekko-agent/src'

type EkkoLogSourceProvider = (profile: string) => StructuredAgentLogSource | null

/**
 * Optional legacy registrar. Returns `null` when the Ekko agent reader is not
 * available; Hermes log listing/read is registered independently and must keep
 * working without it.
 */
function registerEkkoLogSource(): EkkoLogSourceProvider | null {
  if (typeof EkkoDirectoryManager !== 'function' || typeof EkkoFileLogReader !== 'function') return null
  return profile => {
    try {
      const directory = new EkkoDirectoryManager(config.appHome).profileLogsPath(profile)
      const filePath = join(directory, EKKO_LOG_FILE_NAME)
      if (!existsSync(filePath)) return null
      const reader = new EkkoFileLogReader({ directory })
      return {
        filePath: reader.filePath,
        query: options => reader.query(options as any),
      }
    } catch {
      return null
    }
  }
}

let ekkoLogSource: EkkoLogSourceProvider | null = null
try {
  // Kept registered for current behavior; Phase 2 drops this registration.
  ekkoLogSource = registerEkkoLogSource()
} catch {
  ekkoLogSource = null
}

// Hermes logs are the mandatory path and never depend on the legacy reader.
configureAgentLogs({
  listPrimaryAgentLogFiles: listLogFiles,
  readPrimaryAgentLogs: readLogs,
  getEkkoLogSource: ekkoLogSource ?? (() => null),
})
