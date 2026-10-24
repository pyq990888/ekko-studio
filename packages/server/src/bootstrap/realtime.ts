import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { config } from '../modules/studio/public/config'
import { logger } from '../modules/studio/public/logging'
import { createSocketIoCorsOrigin, shouldRejectUpgradeOrigin } from '../modules/studio/public/security'

export interface RealtimeHub {
  readonly io: Server
  close: () => Promise<void>
}

/**
 * Creates the process-wide Socket.IO server. Bootstrap owns the transport so
 * feature modules can attach namespaces without owning its lifecycle.
 */
export function createRealtimeHub(httpServers: HttpServer | HttpServer[]): RealtimeHub {
  const servers = Array.isArray(httpServers) ? httpServers : [httpServers]
  const primary = servers[0]
  if (!primary) throw new Error('[realtime] at least one HTTP server is required')

  const io = new Server(primary, {
    cors: { origin: createSocketIoCorsOrigin(config.corsOrigins) },
    maxHttpBufferSize: 2_000_000,
    allowRequest: (req, callback) => {
      if (shouldRejectUpgradeOrigin(req, config.corsOrigins)) {
        logger.warn({
          origin: req.headers.origin || '',
          host: req.headers.host || '',
          url: req.url || '',
        }, '[Socket.IO] rejected upgrade origin')
        callback('origin not allowed', false)
        return
      }
      callback(null, true)
    },
    pingInterval: 25_000,
    pingTimeout: 90_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60_000,
      skipMiddlewares: true,
    },
  })
  servers.slice(1).forEach(httpServer => io.attach(httpServer))

  let closePromise: Promise<void> | null = null

  return {
    io,
    close(): Promise<void> {
      if (!closePromise) {
        closePromise = Promise.resolve()
          .then(() => io.close())
          .catch((err) => {
            logger.warn(err, '[realtime] failed to close Socket.IO server')
          })
      }
      return closePromise
    },
  }
}
