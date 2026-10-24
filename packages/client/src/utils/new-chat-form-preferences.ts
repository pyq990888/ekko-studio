import { DEFAULT_REASONING_EFFORTS } from './model-reasoning-effort'

export interface NewChatFormPreferences {
  profile: string
  provider: string
  model: string
  customModel: boolean
  reasoningEffort: string
  workspace: string
  categoryId: number | null
}

const memory = new Map<string, NewChatFormPreferences>()
const storageKey = (account: number | null) => `hermes_new_chat_form_v1:${account ?? 'authenticated'}`
const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

export function loadNewChatFormPreferences(account: number | null): NewChatFormPreferences | null {
  const key = storageKey(account)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return memory.get(key) || null
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null
    return {
      profile: stringValue(saved.profile) || 'default',
      provider: stringValue(saved.provider), model: stringValue(saved.model),
      customModel: saved.customModel === true,
      reasoningEffort: DEFAULT_REASONING_EFFORTS.includes(saved.reasoningEffort) ? saved.reasoningEffort : '',
      workspace: stringValue(saved.workspace),
      categoryId: Number.isSafeInteger(saved.categoryId) && saved.categoryId > 0 ? saved.categoryId : null,
    }
  } catch {
    return memory.get(key) || null
  }
}

export function saveNewChatFormPreferences(account: number | null, form: NewChatFormPreferences) {
  const key = storageKey(account)
  memory.set(key, { ...form })
  try { localStorage.setItem(key, JSON.stringify(form)) } catch { /* Keep the in-memory preference. */ }
}
