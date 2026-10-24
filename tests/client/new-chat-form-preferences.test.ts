// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadNewChatFormPreferences, saveNewChatFormPreferences, type NewChatFormPreferences } from '../../packages/client/src/utils/new-chat-form-preferences'

const form: NewChatFormPreferences = {
  profile: 'research', provider: 'manual', model: 'chosen-model', customModel: false,
  reasoningEffort: 'high', workspace: '/workspace/project', categoryId: 12,
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks() })

describe('new-chat form preferences', () => {
  it('remembers model and effort choices per scoped provider', () => {
    saveNewChatFormPreferences(101, form)
    expect(loadNewChatFormPreferences(101)).toEqual(form)
    saveNewChatFormPreferences(101, { ...form, provider: 'openai', model: 'other-model', reasoningEffort: 'low' })
    expect(loadNewChatFormPreferences(101)).toMatchObject({ provider: 'openai', model: 'other-model', reasoningEffort: 'low' })
    expect(loadNewChatFormPreferences(102)).toBeNull()
  })

  it('retains all form choices per account', () => {
    saveNewChatFormPreferences(101, form)
    saveNewChatFormPreferences(102, { ...form, profile: 'default', workspace: '/workspace/other' })
    expect(loadNewChatFormPreferences(101)).toEqual(form)
    expect(loadNewChatFormPreferences(102)).toMatchObject({ profile: 'default', workspace: '/workspace/other' })
    // The API key is not part of the persisted shape at all.
    expect(JSON.parse(localStorage.getItem('hermes_new_chat_form_v1:101')!)).not.toHaveProperty('apiKey')
  })

  it('does not reuse a workspace across profiles', () => {
    saveNewChatFormPreferences(101, form)
    saveNewChatFormPreferences(101, { ...form, profile: 'default', workspace: '' })
    expect(loadNewChatFormPreferences(101)).toMatchObject({ profile: 'default', workspace: '' })
  })

  it('rejects corrupt data and normalizes invalid options', () => {
    localStorage.setItem('hermes_new_chat_form_v1:104', JSON.stringify({ ...form, profile: 42, customModel: 'yes',
      reasoningEffort: 'unsupported-effort', categoryId: -1 }))
    expect(loadNewChatFormPreferences(104)).toMatchObject({
      profile: 'default', customModel: false, reasoningEffort: '', categoryId: null,
    })
    localStorage.setItem('hermes_new_chat_form_v1:104', 'not json')
    expect(loadNewChatFormPreferences(104)).toBeNull()
    localStorage.setItem('hermes_new_chat_form_v1:104', JSON.stringify([1, 2]))
    expect(loadNewChatFormPreferences(104)).toBeNull()
  })

  it('continues to work when browser storage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => saveNewChatFormPreferences(105, form)).not.toThrow()
    vi.restoreAllMocks()
  })
})
