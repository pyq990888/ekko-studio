import { readPresetStyleSource as readFileSync } from './preset-style-source'
import { describe, expect, it } from 'vitest'

const readClientFile = (path: string) => readFileSync(`packages/client/src/${path}`, 'utf8')

describe('client style system', () => {
  it('keeps shared page headers on one layout baseline', () => {
    const globalStyles = readClientFile('styles/global.scss')

    expect(globalStyles).toContain('min-height: 64px;')
    expect(globalStyles).toContain('padding: 14px 20px;')
    expect(globalStyles).toContain('.page-header > .header-actions')
  })

  it('aligns SCSS surfaces and radii with the Naive UI theme', () => {
    const variables = readClientFile('styles/variables.scss')
    const theme = readClientFile('styles/theme.ts')

    expect(variables).toContain('--bg-card: #2a2a2a;')
    expect(theme).toContain("cardColor: '#2a2a2a'")
    expect(variables).toContain('$radius-sm: 6px;')
    expect(variables).toContain('$radius-md: 8px;')
    expect(variables).toContain('$radius-lg: 8px;')
    expect(theme).toContain("borderRadius: '8px'")
    expect(theme).toContain("borderRadiusSmall: '6px'")
  })

  it('uses the custom selection color for the active profile', () => {
    const profileCard = readClientFile('components/hermes/profiles/ProfileCard.vue')

    expect(profileCard).toContain(
      '<NTag v-if="profile.active" size="tiny" type="primary" :bordered="false">',
    )
    expect(profileCard).toMatch(
      /&\.active\s*\{\s*border-color: rgba\(var\(--accent-primary-rgb\), 0\.4\);/,
    )
    expect(profileCard).not.toContain('rgba(var(--success-rgb), 0.4)')
  })

  it('replays the history detail fade when the selected session changes', () => {
    const historyView = readClientFile('views/hermes/HistoryView.vue')
    const historyMessageList = readClientFile('components/hermes/chat/HistoryMessageList.vue')

    expect(historyView).toContain(`:key="historySession?.id || 'history-empty'"`)
    expect(historyMessageList).toContain('animation: history-message-surface-fade-in 1.5s ease both;')
  })

})
