import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordSessionUploadAttachmentsMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../packages/server/src/modules/studio/services/files/session-uploads', () => ({
  recordSessionUploadAttachments: recordSessionUploadAttachmentsMock,
}))
vi.mock('../../packages/server/src/modules/studio/services/session-shares/socket-access', () => ({
  bindSessionShareSocket: vi.fn(),
}))

const saveTaskPlanMock = vi.hoisted(() => vi.fn())
const updateSessionTasksMock = vi.hoisted(() => vi.fn((sessionId: string) => ({ session_id: sessionId, revision: 1, updated_at: 1, tasks: [] })))
vi.mock('../../packages/server/src/modules/studio/services/session-tasks', async importOriginal => ({
  ...await importOriginal<typeof import('../../packages/server/src/modules/studio/services/session-tasks')>(),
  getSessionTasks: (sessionId: string) => ({ session_id: sessionId, revision: 0, updated_at: 0, tasks: [] }),
  updateSessionTasks: updateSessionTasksMock,
}))
vi.mock('../../packages/server/src/modules/studio/repositories/task-plan-store', () => ({
  saveTaskPlan: saveTaskPlanMock, listTaskPlansForPage: vi.fn(() => []),
}))

const handleBridgeRunMock = vi.hoisted(() => vi.fn(async () => {}))
const resumeBridgeRunMock = vi.hoisted(() => vi.fn(async () => {}))
const handleEkkoAgentRunMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../packages/server/src/modules/studio/services/chat-run/handle-ekko-agent-run', () => ({
  handleEkkoAgentRun: handleEkkoAgentRunMock,
}))
const handleEkkoCommandMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../packages/server/src/modules/studio/services/chat-run/ekko-session-command', async importOriginal => ({
  ...await importOriginal<typeof import('../../packages/server/src/modules/studio/services/chat-run/ekko-session-command')>(),
  handleEkkoSessionCommand: handleEkkoCommandMock,
}))
const handleCodingAgentRunMock = vi.hoisted(() => vi.fn(async () => {}))
const loadSessionStateFromDbMock = vi.hoisted(() => vi.fn())
const startBridgeMock = vi.hoisted(() => vi.fn())
const ensureReadyMock = vi.hoisted(() => vi.fn())
const getRuntimeStateMock = vi.hoisted(() => vi.fn())
const userCanAccessProfileMock = vi.hoisted(() => vi.fn((_user: unknown, _profile: string) => true))
const getSessionMock = vi.hoisted(() => vi.fn((sessionId?: string) => sessionId
  ? { id: sessionId, profile: 'default', source: 'cli', model: 'gpt-test', provider: 'openai' }
  : undefined))
const bridgeMock = vi.hoisted(() => ({
  status: vi.fn(),
  statusIfLoaded: vi.fn(),
  releaseBackgroundNotification: vi.fn(async () => ({ ok: true, released: true })),
  close: vi.fn(async () => {}),
  approvalRespond: vi.fn(async () => ({ resolved: true })),
  clarifyRespond: vi.fn(async () => ({ resolved: true })),
}))

vi.mock('../../packages/server/src/modules/studio/services/chat-run/handle-bridge-run', () => ({
  handleBridgeRun: handleBridgeRunMock,
  resumeBridgeRun: resumeBridgeRunMock,
}))

vi.mock('../../packages/server/src/modules/studio/services/chat-run/load-state', () => ({
  loadSessionStateFromDb: loadSessionStateFromDbMock,
  readSessionStateFromDb: vi.fn(() => ({ messages: [], isWorking: false, events: [], queue: [] })),
  resolveRunSource: vi.fn((source?: string) => source || 'cli'),
}))

vi.mock('../../packages/server/src/modules/studio/services/chat-run/handle-coding-agent-run', () => ({
  handleCodingAgentRun: handleCodingAgentRunMock,
}))

vi.mock('../../packages/server/src/modules/studio/services/chat-run/session-command', () => ({
  handleSessionCommand: vi.fn(),
  isSessionCommand: vi.fn(() => false),
  parseSessionCommand: vi.fn(() => null),
}))

vi.mock('../../packages/server/src/modules/hermes/services/bridge/index', () => ({
  AgentBridgeClient: vi.fn(() => bridgeMock),
}))

vi.mock('../../packages/server/src/modules/hermes/services/bridge/manager', () => ({
  getAgentBridgeManager: vi.fn(() => ({
    ensureReady: ensureReadyMock,
    getRuntimeState: getRuntimeStateMock,
  })),
}))

vi.mock('../../packages/server/src/modules/studio/public/chat-agent-runtime', () => ({
  getChatCodingAgentMcpServers: vi.fn(() => ({ 'ekko-studio-interaction': { command: 'studio' }, 'ekko-studio-use': { command: 'studio' } })),
  resolveChatEkkoMcpServers: vi.fn(() => ({ 'ekko-studio-use': { command: 'studio' } })),
  createPrimaryAgentBridge: vi.fn(() => bridgeMock),
  getPrimaryAgentBridgeManager: vi.fn(() => ({
    start: startBridgeMock,
    ensureReady: ensureReadyMock,
    getRuntimeState: getRuntimeStateMock,
  })),
  redactPrimaryAgentBridgeError: (error?: string, endpoint?: string, replacement = '[redacted endpoint]') => {
    if (!error) return error
    const values = [endpoint, endpoint?.replace(/^(?:ipc|tcp):\/\//, '')].filter(Boolean) as string[]
    return values.reduce((value, candidate) => value.split(candidate).join(replacement), error)
  },
  chatCodingAgentRunManager: {
    resolveApproval: vi.fn(() => ({ handled: false, resolved: false })),
    resolveClarification: vi.fn(() => ({ handled: false, resolved: false })),
    stop: vi.fn(),
  },
  handleChatCodingAgentSessionCommand: vi.fn(),
  parseChatCodingAgentSessionCommand: vi.fn(() => null),
  getChatEkkoAgent: vi.fn(() => ({ requestBoundaryInterrupt: vi.fn() })),
  respondToChatEkkoToolApproval: vi.fn(() => ({ handled: false, resolved: false })),
  respondToChatEkkoClarification: vi.fn(() => ({ handled: false, resolved: false })),
}))

vi.mock('../../packages/server/src/modules/studio/public/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../packages/server/src/modules/studio/public/runs/prompt', () => ({
  getSystemPrompt: vi.fn(() => 'system prompt'),
}))

vi.mock('../../packages/server/src/modules/studio/repositories/session-store', () => ({
  getSessionNotificationPreview: vi.fn(() => null),
  getSession: getSessionMock,
  getSessionMetadata: getSessionMock,
  getSessionDetail: vi.fn(() => null),
}))

vi.mock('../../packages/server/src/modules/studio/public/profile-config', () => ({
  readConfigYamlForProfile: vi.fn(async () => ({ mcp_servers: { 'ekko-studio-interaction': { command: 'studio' }, 'ekko-studio-use': { command: 'studio' } } })),
  getActiveProfileName: vi.fn(() => 'default'),
  getProfileDir: vi.fn(() => '/tmp/hermes-default'),
  listProfileNamesFromDisk: vi.fn(() => ['default', 'research']),
}))

vi.mock('../../packages/server/src/modules/studio/public/auth', () => ({
  authenticateUserToken: vi.fn(),
  isAuthEnabled: vi.fn(async () => false),
}))

vi.mock('../../packages/server/src/modules/studio/repositories/users-store', () => ({
  userCanAccessProfile: userCanAccessProfileMock,
}))

function makeServerHarness() {
  const handlers = new Map<string, Function>()
  const emitted: Array<{ room: string; event: string; payload: any }> = []
  const namespace = {
    adapter: { rooms: new Map() },
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, payload: any) => emitted.push({ room, event, payload })),
    })),
    use: vi.fn(),
    on: vi.fn(),
  }
  const io = { of: vi.fn(() => namespace) }
  const socket = {
    id: 'socket-1',
    connected: true,
    handshake: { auth: {}, query: { profile: 'default' } },
    data: {},
    emit: vi.fn(),
    join: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler)
    }),
  }
  return { emitted, handlers, io, namespace, socket }
}

describe('ChatRunSocket global pending interactions', () => {
  it('binds session goals to the active primary turn without publishing a plan card', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { io, emitted } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).sessionMap.set('goal-session', { isWorking: true, activeRunMarker: 'turn-1', source: 'cli' })
    const contextId = (server as any).beginTaskPlanRun('goal-session', 'default')
    expect(server.listSessionTasks(contextId, 'default')).toMatchObject({ session_id: 'goal-session' })
    const input = { context_id: contextId, revision: 0, changes: [{ title: 'Export', summary: 'Requested', status: 'open' }] }
    server.updateSessionTasks(contextId, 'default', input)
    expect(updateSessionTasksMock).toHaveBeenCalledWith('goal-session', 'default', input)
    expect(saveTaskPlanMock).not.toHaveBeenCalled()
    expect(emitted.some(entry => entry.event === 'plan.updated')).toBe(false)
    expect(() => server.listSessionTasks(contextId, 'other')).toThrow('expired')
    ;(server as any).finishTaskPlanRun('goal-session', 'run.completed', undefined, contextId)
    expect(() => server.updateSessionTasks(contextId, 'default', input)).toThrow('expired')
    const background = (server as any).beginTaskPlanRun('goal-session', 'default', false)
    expect(() => server.listSessionTasks(background, 'default')).toThrow('unavailable')
  })

  it('publishes a running snapshot and lightweight completion activity for the profile', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).sessionMap.set('session-running', {
      messages: [],
      events: [],
      queue: [],
      isWorking: true,
      profile: 'default',
    })

    ;(server as any).onConnection(socket)

    expect(socket.emit).toHaveBeenCalledWith('session.activity.snapshot', expect.objectContaining({
      event: 'session.activity.snapshot',
      profile: 'default',
      sessions: [{ session_id: 'session-running', status: 'running' }],
    }))

    ;(server as any).emitSessionActivity('default', 'run.completed', {
      session_id: 'session-running',
      queue_remaining: 0,
    })
    expect(emitted).toContainEqual({
      room: ['pending-interactions:default', 'session:session-running'],
      event: 'session.activity',
      payload: expect.objectContaining({
        session_id: 'session-running',
        status: 'completed',
      }),
    })
  })

  it('publishes approval and clarify lifecycle events to the authenticated profile audience', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    ;(server as any).emitToSession(socket, 'session-b', 'approval.requested', {
      event: 'approval.requested', approval_id: 'approval-b',
    })
    ;(server as any).emitToSession(socket, 'session-b', 'clarify.resolved', {
      event: 'clarify.resolved', clarify_id: 'clarify-b', resolved: true,
    })

    expect(socket.join).toHaveBeenCalledWith('pending-interactions:default')
    expect(emitted).toContainEqual(expect.objectContaining({
      room: 'pending-interactions:default', event: 'approval.requested',
      payload: expect.objectContaining({ session_id: 'session-b', approval_id: 'approval-b' }),
    }))
    expect(emitted).toContainEqual(expect.objectContaining({
      room: 'pending-interactions:default', event: 'clarify.resolved',
      payload: expect.objectContaining({ session_id: 'session-b', clarify_id: 'clarify-b' }),
    }))
  })

  it('rejects cross-profile resume, approval, and clarify requests before joining or calling the bridge', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    ;(socket.data as any).user = { id: 7, username: 'limited-user', role: 'user' }
    userCanAccessProfileMock.mockImplementation((_user: unknown, profile: string) => profile === 'default')
    getSessionMock.mockImplementation((sessionId?: string) => sessionId === 'research-session'
      ? { id: sessionId, profile: 'research', source: 'cli', model: 'gpt-test', provider: 'openai' }
      : sessionId
        ? { id: sessionId, profile: 'default', source: 'cli', model: 'gpt-test', provider: 'openai' }
        : undefined)
    bridgeMock.approvalRespond.mockClear()
    bridgeMock.clarifyRespond.mockClear()
    const server = new ChatRunSocket(io as any)
    const state = {
      messages: [], isWorking: true, queue: [],
      events: [{ event: 'clarify.requested', data: { clarify_id: 'clarify-default' } }],
    }
    ;(server as any).sessionMap.set('default-session', state)

    ;(server as any).onConnection(socket)
    socket.join.mockClear()
    await handlers.get('resume')?.({ session_id: 'research-session' })
    await handlers.get('approval.respond')?.({
      session_id: 'research-session', approval_id: 'approval-research', choice: 'once',
    })
    await handlers.get('clarify.respond')?.({
      session_id: 'research-session', clarify_id: 'clarify-research', response: 'secret',
    })
    await handlers.get('cancel_queued_run')?.({ session_id: 'research-session', queue_id: 'queue-research' })
    await handlers.get('abort')?.({ session_id: 'research-session' })

    bridgeMock.clarifyRespond.mockResolvedValueOnce({ resolved: false })
    await handlers.get('clarify.respond')?.({
      session_id: 'default-session', clarify_id: 'clarify-default', response: 'retry me',
    })

    expect(socket.join).not.toHaveBeenCalled()
    expect(resumeBridgeRunMock).not.toHaveBeenCalled()
    expect(bridgeMock.approvalRespond).not.toHaveBeenCalled()
    expect(bridgeMock.clarifyRespond).toHaveBeenCalledTimes(1)
    expect(state.events).toEqual([
      { event: 'clarify.requested', data: { clarify_id: 'clarify-default' } },
    ])
    expect(socket.emit).toHaveBeenCalledWith('run.failed', expect.objectContaining({
      session_id: 'research-session', error: expect.stringContaining('not available'),
    }))
    expect(socket.emit).toHaveBeenCalledWith('approval.resolved', expect.objectContaining({
      approval_id: 'approval-research', resolved: false,
    }))
    expect(socket.emit).toHaveBeenCalledWith('clarify.resolved', expect.objectContaining({
      clarify_id: 'clarify-research', resolved: false,
    }))
    expect(socket.emit).toHaveBeenCalledWith('clarify.resolved', expect.objectContaining({
      clarify_id: 'clarify-default',
      resolved: false,
      stale: true,
      error: 'Clarification is no longer pending.',
    }))
  })
})

describe('ensureBridgeReadyForChatRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startBridgeMock.mockReset()
    startBridgeMock.mockResolvedValue(undefined)
    ensureReadyMock.mockReset()
    getRuntimeStateMock.mockReset()
    bridgeMock.status.mockReset()
    bridgeMock.statusIfLoaded.mockReset()
    bridgeMock.releaseBackgroundNotification.mockReset()
    bridgeMock.close.mockReset()
    bridgeMock.releaseBackgroundNotification.mockResolvedValue({ ok: true, released: true })
    bridgeMock.close.mockResolvedValue(undefined)
    handleBridgeRunMock.mockReset()
    resumeBridgeRunMock.mockReset()
    handleCodingAgentRunMock.mockReset()
    loadSessionStateFromDbMock.mockReset()
    getSessionMock.mockReset()
    getSessionMock.mockImplementation((sessionId?: string) => sessionId
      ? { id: sessionId, profile: 'default', source: 'cli', model: 'gpt-test', provider: 'openai' }
      : undefined)
    ensureReadyMock.mockResolvedValue({
      reachable: true,
      status: 'ready',
      endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
    })
    getRuntimeStateMock.mockReturnValue({ endpoint: 'ipc:///tmp/hermes-agent-bridge.sock' })
  })

  it('allows reachable bridge readiness', async () => {
    const { ensureBridgeReadyForChatRun } = await import('../../packages/server/src/modules/studio/sockets/chat-run')

    await expect(ensureBridgeReadyForChatRun()).resolves.toEqual({ ok: true })
    expect(startBridgeMock).toHaveBeenCalledTimes(1)
    expect(ensureReadyMock).toHaveBeenCalledWith({ timeoutMs: 1000, connectRetryMs: 0, recover: false })
  })

  it('returns a visible error when the bridge is unreachable', async () => {
    ensureReadyMock.mockResolvedValueOnce({
      reachable: false,
      status: 'unreachable',
      endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
      error: 'connect ECONNREFUSED ipc:///tmp/hermes-agent-bridge.sock',
    })
    const { ensureBridgeReadyForChatRun } = await import('../../packages/server/src/modules/studio/sockets/chat-run')

    await expect(ensureBridgeReadyForChatRun()).resolves.toEqual({
      ok: false,
      error: 'connect ECONNREFUSED configured endpoint',
    })
  })

  it('redacts configured tcp host:port when the bridge is unreachable', async () => {
    ensureReadyMock.mockResolvedValueOnce({
      reachable: false,
      status: 'unreachable',
      endpoint: 'tcp://example.internal:43123',
      error: 'connect ECONNREFUSED example.internal:43123',
    })
    const { ensureBridgeReadyForChatRun } = await import('../../packages/server/src/modules/studio/sockets/chat-run')

    await expect(ensureBridgeReadyForChatRun()).resolves.toEqual({
      ok: false,
      error: 'connect ECONNREFUSED configured endpoint',
    })
  })

  it('handles thrown ensureReady failures', async () => {
    ensureReadyMock.mockRejectedValueOnce(new Error('bridge startup timed out'))
    const { ensureBridgeReadyForChatRun } = await import('../../packages/server/src/modules/studio/sockets/chat-run')

    await expect(ensureBridgeReadyForChatRun()).resolves.toEqual({
      ok: false,
      error: 'bridge startup timed out',
    })
  })

  it('returns the recorded Runtime failure without starting the bridge when Runtime is unavailable', async () => {
    const previousSource = process.env.HERMES_RUNTIME_SOURCE
    process.env.HERMES_RUNTIME_SOURCE = 'none'
    const registry = await import('../../packages/server/src/modules/studio/public/agent-status-registry')
    registry.updateAgentStatus('hermes', {
      installed: false,
      source: 'not-installed',
      error: 'Runtime 0.21.0 is missing python/run_agent.py',
    })
    try {
      const { ensureBridgeReadyForChatRun } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
      await expect(ensureBridgeReadyForChatRun()).resolves.toEqual({
        ok: false,
        error: 'Runtime 0.21.0 is missing python/run_agent.py',
        runtimeUnavailable: true,
      })
      expect(startBridgeMock).not.toHaveBeenCalled()
      expect(ensureReadyMock).not.toHaveBeenCalled()
    } finally {
      if (previousSource === undefined) delete process.env.HERMES_RUNTIME_SOURCE
      else process.env.HERMES_RUNTIME_SOURCE = previousSource
      registry.resetAgentStatusRegistryForTests()
    }
  })
})

describe('ChatRunSocket bridge readiness gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startBridgeMock.mockReset()
    startBridgeMock.mockResolvedValue(undefined)
    ensureReadyMock.mockReset()
    getRuntimeStateMock.mockReset()
    bridgeMock.status.mockReset()
    bridgeMock.statusIfLoaded.mockReset()
    bridgeMock.releaseBackgroundNotification.mockReset()
    bridgeMock.close.mockReset()
    bridgeMock.releaseBackgroundNotification.mockResolvedValue({ ok: true, released: true })
    bridgeMock.close.mockResolvedValue(undefined)
    handleBridgeRunMock.mockReset()
    resumeBridgeRunMock.mockReset()
    handleCodingAgentRunMock.mockReset()
    loadSessionStateFromDbMock.mockReset()
    ensureReadyMock.mockResolvedValue({
      reachable: true,
      status: 'ready',
      endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
    })
    getRuntimeStateMock.mockReturnValue({ endpoint: 'ipc:///tmp/hermes-agent-bridge.sock' })
    bridgeMock.statusIfLoaded.mockResolvedValue({ ok: true, exists: false, running: false, loaded: false })
    loadSessionStateFromDbMock.mockResolvedValue({
      messages: [],
      isWorking: false,
      isAborting: false,
      events: [],
      queue: [],
    })
  })

  it('emits run.failed before starting a cli run when the bridge is unreachable', async () => {
    ensureReadyMock.mockResolvedValueOnce({
      reachable: false,
      status: 'unreachable',
      endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
      error: 'bridge offline',
    })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('run')?.({ input: 'hello', session_id: 'session-1', source: 'cli' })

    expect(handleBridgeRunMock).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('run.failed', {
      event: 'run.failed',
      session_id: 'session-1',
      error: 'Agent Bridge is not reachable: bridge offline',
    })
    expect((server as any).sessionMap.get('session-1')).toEqual(expect.objectContaining({
      isWorking: false,
      profile: undefined,
    }))
  })

  it('routes legacy api_server runs through the bridge path', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('run')?.({ input: 'hello', session_id: 'session-1', source: 'api_server' })

    expect(ensureReadyMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock.mock.calls[0][2]).toEqual(expect.objectContaining({
      input: 'hello',
      source: 'api_server',
    }))
    expect(socket.emit).not.toHaveBeenCalledWith('run.failed', expect.anything())
  })

  it('routes global-agent Hermes runs through the bridge run path while preserving session source', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('run')?.({
      input: 'hello',
      session_id: 'session-1',
      source: 'cli',
      session_source: 'global_agent',
    })

    expect(ensureReadyMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock.mock.calls[0][2]).toEqual(expect.objectContaining({
      source: 'cli',
      session_source: 'global_agent',
    }))
    expect(socket.emit).not.toHaveBeenCalledWith('run.failed', expect.anything())
  })

  it('keeps workflow Hermes runs behind the broker readiness gate', async () => {
    ensureReadyMock.mockResolvedValueOnce({
      reachable: false,
      status: 'unreachable',
      endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
      error: 'bridge offline',
    })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('run')?.({
      input: 'next workflow node',
      session_id: 'workflow-session-1',
      source: 'workflow',
      session_source: 'workflow',
    })

    expect(ensureReadyMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('run.failed', {
      event: 'run.failed',
      session_id: 'workflow-session-1',
      error: 'Agent Bridge is not reachable: bridge offline',
    })
  })

  it('continues with remaining queued bridge runs when readiness fails before a dequeued run starts', async () => {
    ensureReadyMock
      .mockResolvedValueOnce({
        reachable: false,
        status: 'unreachable',
        endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
        error: 'bridge offline',
      })
      .mockResolvedValueOnce({
        reachable: true,
        status: 'ready',
        endpoint: 'ipc:///tmp/hermes-agent-bridge.sock',
      })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).sessionMap.set('session-1', {
      messages: [],
      isWorking: true,
      isAborting: false,
      events: [],
      queue: [{
        queue_id: 'queue-next',
        input: 'second queued message',
        source: 'cli',
        profile: 'default',
      }],
      profile: 'default',
      source: 'cli',
    })

    ;(server as any).runQueuedItem(socket, 'session-1', {
      queue_id: 'queue-failed',
      input: 'first queued message',
      source: 'cli',
      profile: 'default',
    }, 'default')

    await vi.waitFor(() => expect(ensureReadyMock).toHaveBeenCalledTimes(2))
    expect(handleBridgeRunMock).toHaveBeenCalledTimes(1)
    expect(handleBridgeRunMock.mock.calls[0][2]).toEqual(expect.objectContaining({
      input: 'second queued message',
      queue_id: 'queue-next',
    }))
    expect(socket.emit).toHaveBeenCalledWith('run.failed', {
      event: 'run.failed',
      session_id: 'session-1',
      queue_id: 'queue-failed',
      error: 'Agent Bridge is not reachable: bridge offline',
      queue_remaining: 1,
    })
    expect(emitted).toContainEqual({
      room: 'session:session-1',
      event: 'run.queued',
      payload: expect.objectContaining({
        event: 'run.queued',
        session_id: 'session-1',
        queue_length: 0,
        dequeued_queue_id: 'queue-next',
      }),
    })
  })

  it('recovers the terminal result of a cached run that lost its consumer', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).sessionMap.set('session-1', {
      messages: [], events: [], queue: [], source: 'cli', isWorking: true,
      runId: 'old-run', activeRunMarker: 'old-marker',
    })
    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })
    expect(bridgeMock.statusIfLoaded).toHaveBeenCalledWith('session-1', 'default', { timeoutMs: 1000 })
    expect(resumeBridgeRunMock).toHaveBeenCalledWith(expect.anything(), socket,
      expect.objectContaining({ sessionId: 'session-1', runId: 'old-run' }), expect.anything(), bridgeMock, expect.any(Function))
  })

  it('preserves a live consumer while its terminal accounting is pending', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).sessionMap.set('session-1', {
      messages: [], events: [], queue: [], source: 'cli', isWorking: true,
      runId: 'old-run', activeRunMarker: 'old-marker', bridgeRunPollMarker: 'old-marker',
    })
    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })
    expect(bridgeMock.statusIfLoaded).toHaveBeenCalled()
    expect(resumeBridgeRunMock).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('resumed', expect.objectContaining({ isWorking: true }))
  })

  it('ignores a status reply for a run superseded during reconnect', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    const state = { messages: [], events: [], queue: [], source: 'cli', isWorking: true,
      runId: 'old-run', activeRunMarker: 'old-marker' }
    ;(server as any).sessionMap.set('session-1', state)
    bridgeMock.statusIfLoaded.mockImplementationOnce(async () => {
      Object.assign(state, { runId: 'new-run', activeRunMarker: 'new-marker' })
      return { running: true, current_run_id: 'old-run' }
    })
    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })
    expect(resumeBridgeRunMock).not.toHaveBeenCalled()
    expect(state).toMatchObject({ runId: 'new-run', activeRunMarker: 'new-marker' })
  })

  it('reattaches a loaded running bridge run without probing manager readiness again', async () => {
    bridgeMock.statusIfLoaded
      .mockResolvedValueOnce({
        ok: true,
        exists: true,
        running: true,
        current_run_id: 'run-1',
        loaded: true,
      })
      .mockResolvedValueOnce({
        ok: true,
        exists: true,
        running: true,
        current_run_id: 'run-1',
        loaded: true,
      })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })

    expect(ensureReadyMock).not.toHaveBeenCalled()
    expect(resumeBridgeRunMock).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenCalledWith('resumed', expect.objectContaining({
      session_id: 'session-1',
      isWorking: true,
    }))
    expect(emitted.some(({ event }) => event === 'run.failed')).toBe(false)
    expect((server as any).sessionMap.get('session-1')).toEqual(expect.objectContaining({
      isWorking: true,
      isAborting: false,
      runId: 'run-1',
      activeRunMarker: undefined,
      profile: 'default',
      source: 'cli',
      events: [],
    }))
    expect((server as any).bridgeResumePolls.size).toBe(0)
  })

  it('emits a non-terminal reattach warning and preserves stale state when bridge status lookup throws during resume', async () => {
    bridgeMock.statusIfLoaded.mockRejectedValueOnce(new Error('connect ECONNREFUSED ipc:///tmp/hermes-agent-bridge.sock'))
    loadSessionStateFromDbMock.mockResolvedValueOnce({
      messages: [],
      isWorking: false,
      isAborting: true,
      runId: 'stale-run',
      activeRunMarker: 'marker-1',
      profile: 'default',
      source: 'cli',
      events: [{ event: 'run.started', data: { run_id: 'stale-run' } }],
      queue: [],
    })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })

    expect(ensureReadyMock).not.toHaveBeenCalled()
    expect(resumeBridgeRunMock).not.toHaveBeenCalled()
    expect(emitted).toContainEqual({
      room: 'session:session-1',
      event: 'run.reattach_failed',
      payload: {
        event: 'run.reattach_failed',
        session_id: 'session-1',
        error: 'connect ECONNREFUSED configured endpoint',
        message: 'Unable to confirm Agent Bridge status while resuming: connect ECONNREFUSED configured endpoint',
        text: 'Unable to confirm Agent Bridge status while resuming: connect ECONNREFUSED configured endpoint',
      },
    })
    expect(socket.emit).toHaveBeenCalledWith('resumed', expect.objectContaining({
      session_id: 'session-1',
      isWorking: false,
      isAborting: true,
      events: [expect.objectContaining({
        event: 'run.reattach_failed',
        data: expect.objectContaining({
          error: 'connect ECONNREFUSED configured endpoint',
        }),
      })],
    }))
    expect((server as any).sessionMap.get('session-1')).toEqual(expect.objectContaining({
      isWorking: false,
      isAborting: true,
      runId: 'stale-run',
      activeRunMarker: 'marker-1',
      profile: 'default',
      source: 'cli',
      events: expect.arrayContaining([
        expect.objectContaining({ event: 'run.started' }),
        expect.objectContaining({
          event: 'run.reattach_failed',
          data: expect.objectContaining({
            error: 'connect ECONNREFUSED configured endpoint',
          }),
        }),
      ]),
    }))
    expect((server as any).bridgeResumePolls.size).toBe(0)
  })

  it('suppresses transient bridge status timeout warnings while resuming', async () => {
    bridgeMock.statusIfLoaded.mockRejectedValueOnce(new Error('Agent bridge request timed out after 1000ms'))
    loadSessionStateFromDbMock.mockResolvedValueOnce({
      messages: [],
      isWorking: false,
      isAborting: false,
      runId: undefined,
      activeRunMarker: undefined,
      profile: 'default',
      source: 'cli',
      events: [],
      queue: [],
    })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)

    ;(server as any).onConnection(socket)
    await handlers.get('resume')?.({ session_id: 'session-1' })

    expect(ensureReadyMock).not.toHaveBeenCalled()
    expect(resumeBridgeRunMock).not.toHaveBeenCalled()
    expect(emitted.some(({ event }) => event === 'run.reattach_failed')).toBe(false)
    expect(socket.emit).toHaveBeenCalledWith('resumed', expect.objectContaining({
      session_id: 'session-1',
      isWorking: false,
      events: [],
    }))
    expect((server as any).sessionMap.get('session-1')).toEqual(expect.objectContaining({
      isWorking: false,
      events: [],
    }))
    expect((server as any).bridgeResumePolls.size).toBe(0)
  })

  it('releases queued background completion claims before closing bridge clients', async () => {
    const order: string[] = []
    bridgeMock.releaseBackgroundNotification.mockImplementationOnce(async () => {
      order.push('release')
      return { ok: true, released: true }
    })
    bridgeMock.close.mockImplementation(async () => {
      order.push('close')
    })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { io } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).sessionMap.set('session-1', {
      messages: [],
      isWorking: true,
      isAborting: false,
      events: [],
      queue: [{
        queue_id: 'delegation-d1',
        input: 'completion',
        profile: 'default',
        source: 'cli',
        backgroundDelegationId: 'd1',
        backgroundClaimId: 'claim-1',
      }],
    })

    await server.close()

    expect(bridgeMock.releaseBackgroundNotification).toHaveBeenCalledWith(
      'session-1',
      'default',
      'd1',
      'claim-1',
    )
    expect(order[0]).toBe('release')
    expect(order.slice(1)).toEqual(['close', 'close'])
    expect((server as any).sessionMap.size).toBe(0)
    expect((server as any).closing).toBe(true)
  })
})


describe('ChatRunSocket MCP task plan lifecycle', () => {
  const input = 'Implement a feature'
  const planUpdate = {
    explanation: 'Verify the change',
    plan: [{ id: 'verify', step: 'Verify the change', status: 'pending' }],
  }
  it.each([false, true])('keeps Hermes plans alive until completion without treating runtime interrupted=%s as Stop', async interrupted => {
    getSessionMock.mockReturnValue({ id: 'session-1', profile: 'default', source: 'cli', agent: 'hermes' })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { emitted, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ensureReadyMock.mockResolvedValue({ reachable: true, status: 'ready' })
    let contextId = ''
    handleBridgeRunMock.mockImplementationOnce((async (_nsp: any, _socket: any, data: any, _profile: any, sessions: any) => {
      contextId = data.task_plan_context_id
      const state = sessions.get(data.session_id)
      Object.assign(state, { isWorking: true, activeRunMarker: 'cli-turn-1' })
      server.updateTaskPlan(contextId, 'default', planUpdate)
      state.activeRunMarker = undefined
      state.isWorking = false
      data.onEvent('run.completed', { event: 'run.completed', result: { interrupted } })
    }) as any)
    await (server as any).handleRun(socket, { session_id: 'session-1', source: 'cli', input }, 'default')
    const updates = emitted.filter(item => item.event === 'plan.updated')
    expect(updates.map(item => item.payload.execution_state)).toEqual(['running', 'ended'])
    expect(updates[1].payload.plan).toEqual([{ id: 'verify', step: 'Verify the change', status: 'pending' }])
    expect(() => server.updateTaskPlan(contextId, 'default', planUpdate)).toThrow('expired')
  })
})

describe('MCP-aware run guidance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReturnValue({ id: 'session-1', profile: 'research', source: 'cli', agent: 'hermes' })
  })
  it.each(['cli', 'workflow', 'group_chat'])('omits Hermes task contexts when MCPs are disabled on %s', async source => {
    const { readConfigYamlForProfile } = await import('../../packages/server/src/modules/studio/public/profile-config')
    vi.mocked(readConfigYamlForProfile).mockResolvedValueOnce({ mcp_servers: { 'ekko-studio-interaction': { enabled: false } } })
    ensureReadyMock.mockResolvedValue({ reachable: true, status: 'ready' })
    handleBridgeRunMock.mockReset()
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    await (server as any).handleRun(socket, { session_id: 'session-1', source, input: 'Plan this work' }, 'research')
    const data = (handleBridgeRunMock.mock.calls as any)[0][2]
    expect(data.task_plan_context_id).toBeUndefined()
    expect(data.instructions).not.toContain('ekko_studio_')
    expect(readConfigYamlForProfile).toHaveBeenLastCalledWith('research')
  })

  it.each(['file', 'image', 'text'])('accepts a %s block in a new local session before it is persisted', async type => {
    getSessionMock.mockReturnValue(undefined)
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    const run = vi.spyOn(server as any, 'handleRun').mockResolvedValue(undefined)
    ;(server as any).onConnection(socket)
    const input = [{ type, path: '/uploads/attachment.txt', name: 'attachment.txt', text: 'hello' }]
    await handlers.get('run')!({ session_id: 'new-local-session', profile: 'default', input })
    expect(socket.emit).not.toHaveBeenCalledWith('run.failed', expect.anything())
    expect(run).toHaveBeenCalledWith(socket, expect.objectContaining({ session_id: 'new-local-session', input }), 'default', false, undefined)
    expect(recordSessionUploadAttachmentsMock).toHaveBeenCalledWith('new-local-session', 'default', input, { allowPendingSession: true })
  })

  it('rejects attachments when the requested run profile differs from the stored session profile', async () => {
    getSessionMock.mockReturnValue({ id: 'research-session', profile: 'research', source: 'cli', model: 'gpt-test', provider: 'openai' })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    const run = vi.spyOn(server as any, 'handleRun').mockResolvedValue(undefined)
    ;(server as any).onConnection(socket)
    await handlers.get('run')!({ session_id: 'research-session', profile: 'default', input: [{ type: 'file', path: '/uploads/private.txt' }] })
    expect(socket.emit).toHaveBeenCalledWith('run.failed', expect.objectContaining({ error: 'Profile "research" is not available on this connection' }))
    expect(recordSessionUploadAttachmentsMock).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  it('registers host attachments for local Hermes sessions', async () => {
    recordSessionUploadAttachmentsMock.mockClear()
    getSessionMock.mockReturnValue({ id: 'session-1', profile: 'default', source: 'cli', agent: 'hermes' })
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    ;(server as any).onConnection(socket)
    ;(server as any).sessionMap.set('session-1', { isWorking: true, queue: [], events: [] })
    const input = [{ type: 'file', path: '/uploads/attachment.txt', name: 'attachment.txt' }]
    await handlers.get('run')!({ session_id: 'session-1', input })
    expect(recordSessionUploadAttachmentsMock).toHaveBeenCalledWith('session-1', 'default', input, { allowPendingSession: true })
    expect((server as any).sessionMap.get('session-1').queue).toHaveLength(1)
  })
})


describe('cross-profile session resume', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockImplementation((sessionId?: string) => sessionId
      ? { id: sessionId, profile: 'research', source: 'cli', model: 'gpt-test', provider: 'openai' }
      : undefined)
  })

  it('resumes a session owned by another profile the user can access', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    const server = new ChatRunSocket(io as any)
    const resumeSession = vi.spyOn(server as any, 'resumeSession').mockResolvedValue(undefined)

    ;(server as any).onConnection(socket)
    await handlers.get('resume')!({ session_id: 'research-session' })

    // The connection was handshaked as `default`, but reading a session the user can
    // access must not be pinned to the handshake profile: otherwise the client gets
    // `run.failed` instead of `resumed` and the conversation stays blank.
    expect(socket.emit).not.toHaveBeenCalledWith('run.failed', expect.anything())
    expect(socket.join).toHaveBeenCalledWith('session:research-session')
    expect(resumeSession).toHaveBeenCalledWith(socket, 'research-session')
  })

  it('still rejects a session from a profile the user cannot access', async () => {
    const { ChatRunSocket } = await import('../../packages/server/src/modules/studio/sockets/chat-run')
    const { handlers, io, socket } = makeServerHarness()
    socket.data = { user: { id: 7, role: 'user' } as any }
    userCanAccessProfileMock.mockReturnValueOnce(false)
    const server = new ChatRunSocket(io as any)
    const resumeSession = vi.spyOn(server as any, 'resumeSession').mockResolvedValue(undefined)

    ;(server as any).onConnection(socket)
    await handlers.get('resume')!({ session_id: 'research-session' })

    expect(socket.emit).toHaveBeenCalledWith('run.failed', expect.objectContaining({
      error: 'Profile "research" is not available for this user',
    }))
    expect(resumeSession).not.toHaveBeenCalled()
  })
})
