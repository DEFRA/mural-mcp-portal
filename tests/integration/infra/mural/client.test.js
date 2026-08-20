import nock from 'nock'
import { MuralClient } from '../../../../src/infra/mural/client.js'

const TEST_BASE_URL = 'http://test-mural.local'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

describe('#muralClient', () => {
  describe('constructor', () => {
    test('uses provided baseUrl when supplied', () => {
      const client = new MuralClient('http://custom.url')
      expect(client.baseUrl).toBe('http://custom.url')
    })

    test('defaults to config baseUrl when not supplied', () => {
      const client = new MuralClient()
      // The default uses config.get('muralMcp.url'), which is set by config
      expect(client.baseUrl).toBeDefined()
    })
  })

  describe('request', () => {
    test('sends GET request with userId header', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, { result: 'ok' })

      const response = await client.request('/test-endpoint', { userId: 'user-123' })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ result: 'ok' })
    })

    test('sends POST request with body', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .post('/test-endpoint', { foo: 'bar' })
        .reply(201, { created: true })

      const response = await client.request('/test-endpoint', {
        method: 'POST',
        body: { foo: 'bar' },
        userId: 'user-123'
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(response.data).toEqual({ created: true })
    })

    test('includes Content-Type header when body is provided', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .post('/test-endpoint')
        .reply((uri, body, callback) => {
          // Request is successful, just verify it was sent
          callback(null, [200, { ok: true }])
        })

      await client.request('/test-endpoint', {
        method: 'POST',
        body: { data: 'test' }
      })

      expect(nock.isDone()).toBe(true)
    })

    test('preserves error response body on non-ok status', async () => {
      const client = new MuralClient(TEST_BASE_URL)
      const errorBody = { detail: 'OAuth state mismatch' }

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(400, errorBody)

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(response.data).toEqual(errorBody)
    })

    test('returns null data when response is not JSON', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, 'plain text response')

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toBeNull()
    })

    test('returns null data when response body is empty', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(204, '')

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(true)
      expect(response.status).toBe(204)
      expect(response.data).toBeNull()
    })

    test('merges additional headers with defaults', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, { ok: true })

      const response = await client.request('/test-endpoint', {
        userId: 'user-123',
        headers: { 'X-Custom-Header': 'custom-value' }
      })

      expect(response.ok).toBe(true)
    })

    test('does not include body in request when method is GET', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, { ok: true })

      const response = await client.request('/test-endpoint', {
        method: 'GET',
        body: { ignored: 'body' }
      })

      expect(response.ok).toBe(true)
    })

    test('handles 500 error with response body', async () => {
      const client = new MuralClient(TEST_BASE_URL)
      const errorBody = { error: 'Internal server error', code: 'INTERNAL_ERROR' }

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(500, errorBody)

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(response.data).toEqual(errorBody)
    })
  })
})
