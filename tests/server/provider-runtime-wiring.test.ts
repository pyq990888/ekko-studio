import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Compression resolves the model context window through the Studio provider
 * runtime facade on every Hermes bridge turn. If that seam is never
 * configured, `buildCompressedHistory` throws and the run silently loses its
 * multi-turn history — the model then answers as if the conversation had just
 * started.
 */
describe('Studio provider runtime wiring', () => {
  it('configures the provider runtime during bootstrap', () => {
    const bootstrap = readFileSync('packages/server/src/bootstrap/http.ts', 'utf8')
    expect(bootstrap).toContain("import './provider-runtime-adapter'")
  })

  it('registers every dependency the facade requires', () => {
    const adapter = readFileSync('packages/server/src/bootstrap/provider-runtime-adapter.ts', 'utf8')
    expect(adapter).toContain('configureProviderRuntime({')
    expect(adapter).toContain('getModelContextLength')
    expect(adapter).toContain('getModelRuntimeCapabilities')
    expect(adapter).toContain('invalidateProviderRuntime')
    // The resolver must come from the Hermes models module that survived the
    // slimming, not from the removed coding-agents module.
    expect(adapter).toContain('modules/hermes/services/models/context')
    expect(adapter).not.toContain('coding-agents')
  })

  it('keeps compression dependent on the facade', () => {
    const compression = readFileSync(
      'packages/server/src/modules/studio/services/chat-run/compression.ts',
      'utf8',
    )
    expect(compression).toContain("from '../../public/provider-runtime'")
    expect(compression).toContain('getModelContextLength')
  })
})
