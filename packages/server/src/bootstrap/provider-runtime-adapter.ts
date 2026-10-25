// Studio provider runtime dependencies.
//
// Context-window resolution is still required by chat-run compression, which
// runs for every Hermes bridge turn. The resolver itself lives in the Hermes
// models module, so this seam stays Hermes-only.
import * as modelContext from '../modules/hermes/services/models/context'
import { configureProviderRuntime } from '../modules/studio/public/provider-runtime'

configureProviderRuntime({
  getModelContextLength: modelContext.getModelContextLength,
  getModelRuntimeCapabilities: (...args: any[]) => {
    const resolver = (modelContext as any).getModelRuntimeCapabilities
    return typeof resolver === 'function'
      ? resolver(...args)
      : { contextWindow: modelContext.getModelContextLength(...args) }
  },
  // Native coding-agent run caches were removed with that module; there is
  // nothing left to invalidate.
  invalidateProviderRuntime: () => ({ invalidatedRuns: 0, deferredRuns: 0 }),
})
