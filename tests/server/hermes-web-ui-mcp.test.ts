import { createServer } from 'http'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import pkg from '../../package.json'

function writeRpc(child: ChildProcessWithoutNullStreams, id: number, method: string, params?: unknown) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
}

function waitForRpc(responses: Map<number, any>, id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (responses.has(id)) {
        clearInterval(timer)
        resolve(responses.get(id))
        return
      }
      if (Date.now() - started > 5000) {
        clearInterval(timer)
        reject(new Error(`Timed out waiting for MCP response ${id}`))
      }
    }, 10)
  })
}

function expectProviderSafeToolNames(serverName: string, tools: Array<{ name: string }>) {
  const safeServerName = serverName.replace(/[^A-Za-z0-9_]/g, '_')
  const overlongNames = tools
    .map(tool => `mcp__${safeServerName}__${tool.name}`)
    .filter(name => name.length > 64)
  expect(overlongNames).toEqual([])
}

describe('hermes-web-ui MCP server', () => {
  let child: ChildProcessWithoutNullStreams | null = null
  const homes: string[] = []

  afterEach(() => {
    child?.kill()
    child = null
    for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
  })

  it('exposes a public Web UI API requester tool', async () => {
    const home = mkdtempSync(join(tmpdir(), 'hermes-web-ui-mcp-'))
    homes.push(home)
    mkdirSync(join(home, 'profiles', 'research'), { recursive: true })
    writeFileSync(join(home, 'profiles', 'research', '.model-run-token'), 'profile-token\n')
    let chatRunHits = 0

    const server = createServer((req, res) => {
      if (req.url === '/api/openapi.json') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({
          openapi: '3.0.3',
          tags: [
            { name: 'Chat Run', description: 'Chat run operations' },
            { name: 'Testing', description: 'Test helper operations' },
          ],
          paths: {
            '/api/test-public-requester': {
              post: {
                tags: ['Testing'],
                requestBody: {
                  required: false,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
            '/api/studio/chat-run/runs': {
              post: {
                tags: ['Chat Run'],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['input'],
                        properties: {
                          input: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          authorization: req.headers.authorization || '',
          profile: req.headers['x-hermes-profile'] || '',
        }))
        return
      }
      if (req.url?.startsWith('/api/test-public-requester')) {
        let raw = ''
        req.on('data', chunk => { raw += chunk })
        req.on('end', () => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({
            method: req.method,
            url: req.url,
            body: raw ? JSON.parse(raw) : null,
            profile: req.headers['x-hermes-profile'],
            authorization: req.headers.authorization,
          }))
        })
        return
      }
      if (req.url === '/api/studio/chat-run/runs') {
        chatRunHits += 1
        let raw = ''
        req.on('data', chunk => { raw += chunk })
        req.on('end', () => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({
            ok: true,
            body: raw ? JSON.parse(raw) : null,
          }))
        })
        return
      }
      res.statusCode = 404
      res.end('{}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('expected TCP server address')

    const responses = new Map<number, any>()
    child = spawn(process.execPath, ['bin/ekko-studio-mcp.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HERMES_WEB_UI_URL: `http://127.0.0.1:${address.port}`,
        HERMES_WEB_UI_HOME: home,
        HERMES_WEB_UI_PROFILE: 'research',
        AUTH_TOKEN: '',
      },
    })
    child.stdout.on('data', (chunk) => {
      for (const line of String(chunk).trim().split('\n')) {
        if (!line) continue
        const message = JSON.parse(line)
        responses.set(message.id, message)
      }
    })

    writeRpc(child, 1, 'initialize', {})
    writeRpc(child, 2, 'tools/list')
    writeRpc(child, 3, 'tools/call', {
      name: 'ekko_studio_api_request',
      arguments: {
        method: 'POST',
        path: '/api/test-public-requester',
        query: { q: 'hello' },
        body: { ok: true },
      },
    })
    writeRpc(child, 4, 'resources/list')
    writeRpc(child, 5, 'tools/call', {
      name: 'ekko_studio_api_request',
      arguments: {
        method: 'POST',
        path: '/api/studio/chat-run/runs',
        body: {},
      },
    })
    writeRpc(child, 7, 'tools/call', {
      name: 'ekko_studio_api_openapi_get',
      arguments: {
        path: '/api/studio/chat-run/runs',
        method: 'POST',
      },
    })
    writeRpc(child, 9, 'tools/call', {
      name: 'ekko_studio_api_openapi_get',
      arguments: {},
    })
    writeRpc(child, 10, 'tools/call', {
      name: 'hermes_api_request',
      arguments: {
        method: 'POST',
        path: '/api/test-public-requester',
        body: { legacy: true },
      },
    })

    const initialized = await waitForRpc(responses, 1)
    expect(initialized.result.serverInfo).toMatchObject({
      name: 'ekko-studio-mcp',
      version: pkg.version,
    })
    expect(initialized.result.capabilities).toEqual({ tools: {} })
    expect(initialized.result.instructions).toContain('ekko_studio_api_openapi_get')

    const list = await waitForRpc(responses, 2)
    expectProviderSafeToolNames('ekko-studio-api', list.result.tools)
    expect(list.result.tools).toHaveLength(2)
    expect(list.result.tools.some((tool: any) => tool.name === 'ekko_studio_api_request')).toBe(true)
    expect(list.result.tools.some((tool: any) => tool.name === 'ekko_studio_lan_devices_list')).toBe(false)

    const response = await waitForRpc(responses, 3)
    const payload = JSON.parse(response.result.content[0].text)
    expect(payload.status).toBe(200)
    expect(payload.body).toMatchObject({
      method: 'POST',
      url: '/api/test-public-requester?q=hello',
      body: { ok: true },
      profile: 'research',
      authorization: 'Bearer profile-token',
    })
    writeRpc(child, 11, 'tools/call', {
      name: 'hermes_studio_api_request',
      arguments: { method: 'POST', path: '/api/test-public-requester', body: { oldPrefix: true } },
    })
    const oldPrefix = JSON.parse((await waitForRpc(responses, 11)).result.content[0].text)
    expect(oldPrefix.status).toBe(200)
    expect(oldPrefix.body.body).toEqual({ oldPrefix: true })
    const legacyResponse = await waitForRpc(responses, 10)
    const legacyPayload = JSON.parse(legacyResponse.result.content[0].text)
    expect(legacyPayload.status).toBe(200)
    expect(legacyPayload.body.body).toEqual({ legacy: true })
    writeRpc(child, 8, 'tools/call', {
      name: 'ekko_studio_api_openapi_get',
      arguments: {
        path: '/api/test-public-requester',
        method: 'POST',
      },
    })

    const resource = await waitForRpc(responses, 4)
    expect(resource.error).toMatchObject({
      code: -32601,
      message: 'Method not found: resources/list',
    })

    const invalid = await waitForRpc(responses, 5)
    expect(invalid.result.isError).toBe(true)
    expect(invalid.result.content[0].text).toContain('missing required field body.input')
    expect(chatRunHits).toBe(0)

    const compactManual = await waitForRpc(responses, 7)
    const compactPayload = JSON.parse(compactManual.result.content[0].text)
    expect(compactPayload).toMatchObject({
      moduleCount: 2,
      operationCount: 1,
      operations: [{
        method: 'POST',
        path: '/api/studio/chat-run/runs',
        requestBody: {
          fields: [
            { name: 'input', required: true, type: 'string' },
          ],
        },
      }],
    })
    expect(compactPayload.paths).toBeUndefined()

    const moduleManual = await waitForRpc(responses, 9)
    const modulePayload = JSON.parse(moduleManual.result.content[0].text)
    expect(modulePayload).toMatchObject({
      moduleCount: 2,
      operationCount: 2,
      operationsOmitted: true,
      modules: expect.arrayContaining([
        {
          tag: 'Chat Run',
          operationCount: 1,
          purpose: 'Start a chat or coding-agent run through the HTTP bridge and wait for the result.',
          keywords: expect.arrayContaining(['chat', 'run']),
          description: 'Chat run operations',
        },
        { tag: 'Testing', operationCount: 1, description: 'Test helper operations' },
      ]),
    })
    expect(modulePayload.operations).toBeUndefined()

    const optionalManual = await waitForRpc(responses, 8)
    const optionalPayload = JSON.parse(optionalManual.result.content[0].text)
    expect(optionalPayload.operations[0]).toMatchObject({
      method: 'POST',
      path: '/api/test-public-requester',
      requestBody: { required: false, fields: [] },
    })

    writeRpc(child, 6, 'tools/call', {
      name: 'ekko_studio_api_request',
      arguments: {
        method: 'POST',
        path: '/api/studio/chat-run/runs',
        body: { input: 'hello' },
      },
    })
    const valid = await waitForRpc(responses, 6)
    const validPayload = JSON.parse(valid.result.content[0].text)
    expect(validPayload.status).toBe(200)
    expect(validPayload.body.body).toEqual({ input: 'hello' })
    expect(chatRunHits).toBe(1)

    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  it.each([
    'bin/ekko-studio-mcp.mjs',
    'bin/hermes-studio-mcp.mjs',
    'bin/hermes-web-ui-mcp.mjs',
  ])('reports the package version from the CLI entry %s', async (entry) => {
    const child = spawn(process.execPath, [entry, '--version'], {
      cwd: process.cwd(),
      env: process.env,
    })
    let stdout = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    const code = await new Promise<number | null>(resolve => child.on('close', resolve))

    expect(code).toBe(0)
    expect(stdout.trim()).toBe(`ekko-studio-mcp v${pkg.version}`)
  })



  it('excludes shared planning from Ekko discovery and rejects direct, aliased and catalog calls', async () => {
    const responses = new Map<number, any>()
    child = spawn(process.execPath, ['bin/ekko-studio-mcp.mjs', 'use'], {
      cwd: process.cwd(), env: { ...process.env, HERMES_MCP_NATIVE_TASK_PLAN: '1' },
    })
    let buffer = ''
    child.stdout.on('data', chunk => {
      buffer += String(chunk)
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        if (line.trim()) { const response = JSON.parse(line); responses.set(response.id, response) }
      }
    })
    writeRpc(child, 1, 'initialize', {})
    writeRpc(child, 2, 'tools/list')
    writeRpc(child, 3, 'tools/call', { name: 'ekko_studio_use_toolset', arguments: { action: 'list' } })
    expect((await waitForRpc(responses, 1)).result.instructions).not.toMatch(/task plan/i)
    expect(JSON.stringify((await waitForRpc(responses, 2)).result.tools)).not.toMatch(/task plan/i)
    const catalog = JSON.parse((await waitForRpc(responses, 3)).result.content[0].text)
    expect(catalog.operations.some((tool: any) => tool.name === 'ekko_studio_update_plan')).toBe(false)
    expect(catalog.operations.some((tool: any) => tool.name === 'ekko_studio_use_sessions_count')).toBe(true)
    for (const [index, name] of ['ekko_studio_update_plan', 'hermes_studio_update_plan'].entries()) {
      writeRpc(child, 10 + index, 'tools/call', { name, arguments: {} })
      const response = (await waitForRpc(responses, 10 + index)).result
      expect(response.isError).toBe(true)
      expect(response.content[0].text).toContain('not available')
    }
    for (const [index, action] of ['describe', 'call'].entries()) {
      writeRpc(child, 20 + index, 'tools/call', {
        name: 'ekko_studio_use_toolset', arguments: { action, tool: 'ekko_studio_update_plan', arguments: {} },
      })
      const response = (await waitForRpc(responses, 20 + index)).result
      expect(response.isError).toBe(true)
      expect(response.content[0].text).toContain("Unknown 'use' tool")
    }
  })

  it.each(['response', 'cancel'])('round-trips the direct clarification tool: %s', async outcome => {
    const requests: any[] = []
    let answer: (() => void) | undefined
    const server = createServer((req, res) => {
      let raw = ''
      req.on('data', chunk => { raw += chunk })
      req.on('end', () => {
        requests.push({ path: req.url, method: req.method, body: JSON.parse(raw), profile: req.headers['x-hermes-profile'] })
        if (req.url === '/api/studio/task-plans/update') {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: true, revision: 1 }))
          return
        }
        answer = () => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: true, response: 'custom-folder', reason: 'response' }))
        }
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const responses = new Map<number, any>()
    child = spawn(process.execPath, ['bin/ekko-studio-mcp.mjs', 'plan'], {
      cwd: process.cwd(), env: { ...process.env, HERMES_WEB_UI_URL: `http://127.0.0.1:${(server.address() as any).port}`, HERMES_WEB_UI_PROFILE: 'research', HERMES_MCP_USER_CLARIFICATION: '1' },
    })
    let buffer = ''
    child.stdout.on('data', chunk => {
      buffer += String(chunk)
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1)
        if (line.trim()) { const response = JSON.parse(line); responses.set(response.id, response) }
      }
    })
    try {
      writeRpc(child, 1, 'tools/list')
      const tools = (await waitForRpc(responses, 1)).result.tools
      expect(tools.map((tool: any) => tool.name)).toEqual(['ekko_studio_clarify', 'ekko_studio_update_plan', 'ekko_studio_list_session_tasks', 'ekko_studio_update_session_tasks'])
      expectProviderSafeToolNames('ekko-studio-interaction', tools)
      expect(tools[0].inputSchema.required).toEqual(['context_id', 'question'])
      const input = { context_id: 'current-turn', question: 'Which folder?', choices: ['client', 'server'] }
      writeRpc(child, 2, 'tools/call', { name: 'ekko_studio_clarify', arguments: { ...input, session_id: 'ignored' } })
      for (let attempt = 0; !answer && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 10))
      expect(answer).toBeTypeOf('function')
      expect(responses.has(2)).toBe(false)
      expect(requests).toEqual([{ path: '/api/studio/clarifications/request', method: 'POST', body: input, profile: 'research' }])
      const plan = { context_id: 'current-turn', plan: [{ id: 'implement', step: 'Implement', status: 'in_progress' }] }
      writeRpc(child, 3, 'tools/call', { name: 'ekko_studio_update_plan', arguments: plan })
      expect(JSON.parse((await waitForRpc(responses, 3)).result.content[0].text)).toEqual({ ok: true, revision: 1 })
      expect(requests[1]).toEqual({ path: '/api/studio/task-plans/update', method: 'POST', body: plan, profile: 'research' })
      expect(responses.has(2)).toBe(false)
      if (outcome === 'cancel') {
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } })}\n`)
        expect((await waitForRpc(responses, 2)).result.isError).toBe(true)
      } else {
        answer!()
        expect(JSON.parse((await waitForRpc(responses, 2)).result.content[0].text)).toMatchObject({ response: 'custom-folder', reason: 'response' })
      }
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  })

  it.each(['coding', 'hermes', 'ekko'])('limits the shared interaction MCP tools for %s', async agent => {
    const native = agent === 'ekko'
    const clarify = agent === 'coding'
    const requests: any[] = []
    const server = createServer((req, res) => {
      let raw = ''
      req.on('data', chunk => { raw += chunk })
      req.on('end', () => {
        requests.push({ path: req.url, method: req.method, body: JSON.parse(raw) })
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true, revision: 1 }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as any).port
    const responses = new Map<number, any>()
    child = spawn(process.execPath, ['bin/ekko-studio-mcp.mjs', 'plan'], {
      cwd: process.cwd(), env: { ...process.env, HERMES_WEB_UI_URL: `http://127.0.0.1:${port}`, HERMES_MCP_NATIVE_TASK_PLAN: native ? '1' : '0', HERMES_MCP_USER_CLARIFICATION: agent === 'hermes' ? '0' : '1' },
    })
    let buffer = ''
    child.stdout.on('data', chunk => {
      buffer += String(chunk)
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1)
        if (line.trim()) { const response = JSON.parse(line); responses.set(response.id, response) }
      }
    })
    try {
      writeRpc(child, 1, 'tools/list')
      const tools = (await waitForRpc(responses, 1)).result.tools
      expect(tools.map((tool: any) => tool.name)).toEqual(native ? [] : clarify ? ['ekko_studio_clarify', 'ekko_studio_update_plan', 'ekko_studio_list_session_tasks', 'ekko_studio_update_session_tasks'] : ['ekko_studio_update_plan', 'ekko_studio_list_session_tasks', 'ekko_studio_update_session_tasks'])
      if (!native) expect(tools.find((tool: any) => tool.name === 'ekko_studio_update_plan').inputSchema.required).toEqual(['context_id', 'plan'])
      const input = { context_id: 'current-turn', plan: [{ id: 'check', step: 'Check', status: 'in_progress' }] }
      writeRpc(child, 2, 'tools/call', { name: 'ekko_studio_update_plan', arguments: input })
      const response = (await waitForRpc(responses, 2)).result
      if (!clarify) {
        writeRpc(child, 3, 'tools/call', { name: 'ekko_studio_clarify', arguments: { context_id: 'current-turn', question: 'Q' } })
        expect((await waitForRpc(responses, 3)).result.isError).toBe(true)
        writeRpc(child, 4, 'initialize', {})
        expect((await waitForRpc(responses, 4)).result.instructions).not.toContain('ekko_studio_clarify')
      }
      if (native) {
        expect(response.isError).toBe(true)
        expect(response.content[0].text).toContain('not available')
        expect(requests).toEqual([])
      } else {
        expect(response.isError).not.toBe(true)
        expect(requests).toEqual([{ path: '/api/studio/task-plans/update', method: 'POST', body: input }])
      }
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  })



  it('does not expose retired device operations even when an old launcher requests devices', async () => {
    const responses = new Map<number, any>()
    child = spawn(process.execPath, ['bin/ekko-studio-mcp.mjs', 'devices'], {
      cwd: process.cwd(), env: { ...process.env, HERMES_MCP_TOOLSET: '' },
    })
    child.stdout.on('data', chunk => {
      for (const line of String(chunk).trim().split('\n')) {
        if (!line) continue
        const message = JSON.parse(line)
        responses.set(message.id, message)
      }
    })
    writeRpc(child, 1, 'initialize', {})
    writeRpc(child, 2, 'tools/list')
    writeRpc(child, 3, 'tools/call', { name: 'hermes_lan_devices_list', arguments: {} })
    const list = await waitForRpc(responses, 2)
    expect(list.result.tools.map((tool: any) => tool.name)).toEqual([
      'ekko_studio_api_openapi_get', 'ekko_studio_api_request',
    ])
    const retired = await waitForRpc(responses, 3)
    expect(retired.result.isError).toBe(true)
  })
})
