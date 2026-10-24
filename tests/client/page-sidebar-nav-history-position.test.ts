import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const navSource = readFileSync(
  'packages/client/src/components/layout/PageSidebarNav.vue',
  'utf8',
)
const historyViewSource = readFileSync(
  'packages/client/src/views/hermes/HistoryView.vue',
  'utf8',
)

describe('page sidebar conversation switch', () => {
  it('places history after the single chat tab', () => {
    const switchStart = navSource.indexOf('class="conversation-switch"')
    const switchSource = navSource.slice(switchStart)

    expect(switchStart).toBeGreaterThan(-1)
    expect(switchSource.indexOf('@click="openChat"')).toBeGreaterThan(-1)
    expect(switchSource.indexOf('@click="openChat"')).toBeLessThan(switchSource.indexOf('@click="openHistory"'))
    expect(navSource).not.toContain('@click="openGroupChat"')
    expect(navSource).not.toContain('@click="openWorkflow"')
    expect(navSource.match(/@click="openHistory"/g)).toHaveLength(1)
  })

  it('shows the conversation switch on the history page', () => {
    const historyNav = historyViewSource.match(/<PageSidebarNav[\s\S]*?\/>/)?.[0] || ''

    expect(historyNav).toContain('active="history"')
    expect(historyNav).not.toContain('hide-mode-switch')
  })
})
