import { createHash, randomUUID } from 'node:crypto'

/** Opaque affinity key; never send a profile path or proxy routing key upstream. */
export function openCodeSessionHeaders(
  baseUrl: string,
  sessionId?: string,
  provider?: string,
): Record<string, string> {
  let hostname = ''
  try { hostname = new URL(baseUrl).hostname.toLowerCase() } catch { /* Provider ID may identify a proxy. */ }
  const providerId = provider?.replace(/^custom[:_]/, '').toLowerCase()
  if (
    hostname !== 'opencode.ai' && !hostname.endsWith('.opencode.ai') &&
    !['opencode', 'opencode-go', 'opencode-zen'].includes(providerId || '')
  ) return {}

  return {
    'x-opencode-session': createHash('sha256').update(sessionId?.trim() || randomUUID()).digest('hex'),
  }
}

export const OPENROUTER_APP_HEADERS = {
  'HTTP-Referer': 'https://ekkostudio.xyz',
  'X-OpenRouter-Title': 'Ekko Studio',
  'X-OpenRouter-Categories': 'cli-agent,personal-agent',
} as const

export function openRouterAttributionHeaders(baseUrl: string, provider?: string): Record<string, string> {
  let hostname = ''
  try { hostname = new URL(baseUrl).hostname.toLowerCase() } catch { /* Provider ID may identify a proxy. */ }
  const providerId = provider?.trim().toLowerCase().replace(/^custom[:_]/, '')
  if (hostname !== 'openrouter.ai' && !hostname.endsWith('.openrouter.ai') && providerId !== 'openrouter') return {}
  return { ...OPENROUTER_APP_HEADERS }
}
