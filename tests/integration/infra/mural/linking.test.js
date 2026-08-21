import nock from 'nock'
import {
  getAuthorizationUrl,
  checkLinkingStatus,
  completeLinking
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

describe('#linkingApi', () => {
  describe('getAuthorizationUrl', () => {
    test('should return ok:true with authorization URL on 200', async () => {
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

    test('should throw MuralApiError on non-200 status', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/authorization-url')
        .reply(500, { error: 'Internal server error' })

      await expect(getAuthorizationUrl('user-123'))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 500
        })
    })

    test('should pass userId to request', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/authorization-url')
        .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize' })

      await getAuthorizationUrl('user-xyz-456')

      expect(nock.isDone()).toBe(true)
    })
  })

  describe('checkLinkingStatus', () => {
    test('should return ok:true with connected status', async () => {
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

    test('should return linked: false when not linked', async () => {
      const responseBody = { linked: false }

      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(200, responseBody)

      const result = await checkLinkingStatus('user-123')

      expect(result.ok).toBe(true)
      expect(result.data.linked).toBe(false)
    })

    test('should return token expiry status when available', async () => {
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

    test('should throw MuralApiError on API errors', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(500, { error: 'Service unavailable' })

      await expect(checkLinkingStatus('user-123'))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 500
        })
    })

    test('should throw MuralApiError on 404 (user not found)', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/status')
        .reply(404, { error: 'User not found' })

      await expect(checkLinkingStatus('user-nonexistent'))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 404
        })
    })
  })

  describe('completeLinking', () => {
    test('should return ok:true when linking succeeds', async () => {
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

    test('should return ok:false on validation error (400)', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/callback')
        .query({ code: 'bad-code', state: 'bad-state' })
        .reply(400, { detail: 'OAuth state mismatch' })

      const result = await completeLinking('user-123', { code: 'bad-code', state: 'bad-state' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
      expect(result.data).toBeNull()
    })

    test('should throw MuralApiError on server error (500)', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/callback')
        .query({ code: 'auth-code', state: 'state' })
        .reply(500, { error: 'Internal server error' })

      await expect(completeLinking('user-123', { code: 'auth-code', state: 'state' }))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 500
        })
    })

    test('should pass userId in headers for authentication', async () => {
      nock(MURAL_MCP_URL)
        .get('/linking/callback')
        .query(true)
        .reply(200, { status: 'success' })

      await completeLinking('user-xyz', { code: 'code', state: 'state' })

      expect(nock.isDone()).toBe(true)
    })
  })
})
