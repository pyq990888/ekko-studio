import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('ChatPanel session clicks', () => {
  it('switches the store when the route is already on the clicked session', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('if (chatStore.activeSessionId !== sessionId)')
    expect(source).toContain('await chatStore.switchSession(sessionId)')
  })

  it('opens desktop sessions in a native chat window while preserving the web tab fallback', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('function openSessionInNewTab(sessionId: string, profile = sessionProfile(sessionId))')
    expect(source).toContain('bridge.openChatWindow(sessionId, profile || undefined)')
    expect(source).toContain('window.open(sessionHref(sessionId, profile), "_blank", "noopener,noreferrer")')
    expect(source).toContain('openSessionInNewTab(sessionId, chatStore.activeSession?.profile || null)')
    expect(source).toContain('v-if="hasPageSidebar"')
    expect(source).toContain('!props.standalone && currentMode.value === "chat"')
    expect(source).toContain('<header v-if="!standalone" class="chat-header">')
  })

  it('replays the whole chat surface fade without remounting the input', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('ref="chatMainContentRef" class="chat-main-content"')
    expect(source).toContain('() => chatStore.activeSessionId')
    expect(source).toContain('sessionFadeAnimation = surface.animate(')
    expect(source).toContain('sessionFadeAnimation?.cancel()')
    expect(source).not.toContain(':key="chatStore.activeSessionId" class="chat-main-content"')
  })

  it('uses the shared model dialog while preserving the session Profile and composer focus', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')
    expect(source).toContain(':groups="sessionModelAllGroups"')
    expect(source).toContain(':trigger-element="sessionModelTrigger"')
    expect(source).toContain('session?.profile || null')
    expect(source).toContain('@model-click="openSessionModelPicker(null, $event)"')
    expect(source).toContain('const sessionModelSwitching = ref(false)')
    expect(source).toContain('sessionModelSwitching.value = true')
    expect(source).toContain('sessionModelSwitching.value = false')
    expect(source).toContain(':loading="sessionModelSwitching"')
    expect(readFileSync('packages/client/src/components/hermes/models/ModelCascader.vue', 'utf8')).toContain("t('chat.modelSwitching')")
  })

  it('uses the active sidebar model as the new chat default for the active profile', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('const selectedProvider = appStore.selectedProvider || ""')
    expect(source).toContain('const selectedModel = appStore.selectedModel || ""')
    expect(source).toContain('profile === activeProfileName')
    expect(source).toContain('selectedGroup?.models.includes(selectedModel)')
  })

  it('creates a conversation from the inline composer submission', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('class="new-chat-page"')
    expect(source).toContain(':submit="submitNewChat"')
    expect(source).not.toContain('<NDrawer')
    expect(source).not.toContain('{{ t("chat.newChat") }}\n            </NButton>')
  })

  it('offers MoA presets for Hermes session model switching', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain("selection.provider === 'moa'")
    expect(source).toContain('await applySessionModelSwitch(preset, "moa")')
    expect(source).toContain('sessionMoaGroup.value?.models.length')
  })
})
