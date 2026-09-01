import nock from 'nock'
import {
  getAuthorizationUrl,
  checkLinkingStatus,
  completeLinking,
  testConnection
} from '../../../../src/infra/mural/linking.js'

const MURAL_MCP_URL = 'http://localhost:8086'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

describe('linkingApi', () => {
  describe('getAuthorizationUrl', () => {
    test('returns ok:true with authorization URL on 200', async () => {
      const responseBody = { authorizationUrl: 'https://mural.co/oauth/authorize?client_id=123&state=abc' }

      nock(MURAL_MCP_URL)
        .get('/linking/authorization-url')
        .reply(200, responseBody)

      const result = await getAuthorizationUrl('user-123')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(responseBody)
      expect(result.data.authorizationUrl).toMatch(/https:\/\/mural\.co/)
    })

    test('sends the userId as the X-User-Id header', async () => {
      nock(MURAL_MCP_URL)
        .matchHeader('X-User-Id', 'user-xyz-456')
        .get('/linking/authorization-url')
        .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize' })

      await getAuthorizationUrl('user-xyz-456')
    })

    test('passes a stub:true field through unmodified, no longer special-cased', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/authorization-url')
        .reply(200, { authorizationUrl: 'https://real-consent.example', stub: true })

      const result = await getAuthorizationUrl('user-123')

      expect(result.data).toEqual({ authorizationUrl: 'https://real-consent.example', stub: true })
    })
  })

  describe('checkLinkingStatus', () => {
    test('returns ok:true with connected status', async () => {
      const responseBody = { linked: true, email: 'user@example.com' }

      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(200, responseBody)

      const result = await checkLinkingStatus('user-123')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data.linked).toBe(true)
      expect(result.data.email).toBe('user@example.com')
    })

    test('returns linked: false when not linked', async () => {
      const responseBody = { linked: false }

      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(200, responseBody)

      const result = await checkLinkingStatus('user-123')

      expect(result.ok).toBe(true)
      expect(result.data.linked).toBe(false)
    })

    test('returns token expiry status when available', async () => {
      const responseBody = { linked: true, email: 'user@example.com', expired: true, expires_at: '2026-08-20T20:00:00Z' }

      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(200, responseBody)

      const result = await checkLinkingStatus('user-123')

      expect(result.ok).toBe(true)
      expect(result.data.linked).toBe(true)
      expect(result.data.expired).toBe(true)
      expect(result.data.expires_at).toBeDefined()
    })
  })

  describe('completeLinking', () => {
    test('returns ok:true when linking succeeds', async () => {
      const responseBody = { status: 'success' }

      nock(MURAL_MCP_URL)
        .get('/linking/callback')
        .query({ code: 'auth-code-123', state: 'state-abc' })
        .reply(200, responseBody)

      const result = await completeLinking('user-123', { code: 'auth-code-123', state: 'state-abc' })

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(responseBody)
    })

    test('returns ok:false on validation error (400)', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/callback')
        .query({ code: 'bad-code', state: 'bad-state' })
        .reply(400, { detail: 'OAuth state mismatch' })

      const result = await completeLinking('user-123', { code: 'bad-code', state: 'bad-state' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
      expect(result.data).toBeNull()
    })

    test('sends the userId as the X-User-Id header', async () => {
      nock(MURAL_MCP_URL)
        .matchHeader('X-User-Id', 'user-xyz')
        .get('/linking/callback')
        .query(true)
        .reply(200, { status: 'success' })

      await completeLinking('user-xyz', { code: 'code', state: 'state' })
    })
  })

  describe('testConnection', () => {
    test('reports a working connection with the profile Mural returned', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/test-connection')
        .reply(200, { ok: true, profile: { id: 'u1', email: 'dev@example.com' } })

      const result = await testConnection('dev@example.com')

      expect(result.ok).toBe(true)
      expect(result.data).toEqual({ ok: true, profile: { id: 'u1', email: 'dev@example.com' } })
    })

    test('sends the caller email as the X-User-Id header', async () => {
      const scope = nock(MURAL_MCP_URL)
        .matchHeader('X-User-Id', 'dev@example.com')
        .get('/linking/test-connection')
        .reply(200, { ok: true })

      await testConnection('dev@example.com')

      expect(scope.isDone()).toBe(true)
    })

    test('passes through a refusal without throwing, so the page can explain it', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/test-connection')
        .reply(200, { ok: false, reason: 'Token expired.' })

      const result = await testConnection('dev@example.com')

      expect(result.data).toEqual({ ok: false, reason: 'Token expired.' })
    })

    test('treats a 404 as expected, so the portal can ship ahead of the server', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/test-connection')
        .reply(404, { detail: 'Not Found' })

      const result = await testConnection('dev@example.com')

      expect(result).toEqual({ ok: false, status: 404, data: null })
    })

    test('throws MuralMcpError on an unexpected status (500)', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/test-connection')
        .reply(500, { message: 'Internal server error' })

      await expect(testConnection('dev@example.com'))
        .rejects.toMatchObject({ name: 'MuralMcpError', statusCode: 500 })
    })
  })
})
