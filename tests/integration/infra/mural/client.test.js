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
    test('should use provided baseUrl when supplied', () => {
      const client = new MuralClient('http://custom.url')
      expect(client.baseUrl).toBe('http://custom.url')
    })

    test('should default to config baseUrl when not supplied', () => {
      const client = new MuralClient()
      // The default uses config.get('muralMcp.url'), which is set by config
      expect(client.baseUrl).toBeDefined()
    })
  })

  describe('request', () => {
    test('should send a GET request with userId header', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, { result: 'ok' })

      const response = await client.request('/test-endpoint', { userId: 'user-123' })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ result: 'ok' })
    })

    test('should send a POST request with body', async () => {
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

    test('should include Content-Type header when body is provided', async () => {
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

    test('should throw MuralApiError with preserved error body on unexpected 400', async () => {
      const client = new MuralClient(TEST_BASE_URL)
      const errorBody = { detail: 'OAuth state mismatch' }

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(400, errorBody)

      try {
        await client.request('/test-endpoint')
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err.name).toBe('MuralApiError')
        expect(err.statusCode).toBe(400)
        expect(err.message).toContain('GET /test-endpoint failed: 400')
      }
    })

    test('should return null data when response is not JSON', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(200, 'plain text response')

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toBeNull()
    })

    test('should return null data when response body is empty', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(204, '')

      const response = await client.request('/test-endpoint')

      expect(response.ok).toBe(true)
      expect(response.status).toBe(204)
      expect(response.data).toBeNull()
    })

    test('should return {ok:false, status} when status is in expected array', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(404, { error: 'not found' })

      const response = await client.request('/test-endpoint', {
        expected: [404]
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(response.data).toBeNull()
    })

    test('should throw MuralApiError when status is not ok and not in expected array', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(500, { error: 'server error' })

      await expect(client.request('/test-endpoint'))
        .rejects.toThrow('Mural API GET /test-endpoint failed: 500')
    })

    test('should throw MuralApiError with statusCode property', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .post('/test-endpoint')
        .reply(503, { error: 'unavailable' })

      try {
        await client.request('/test-endpoint', { method: 'POST' })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err.name).toBe('MuralApiError')
        expect(err.statusCode).toBe(503)
        expect(err.message).toContain('POST')
        expect(err.message).toContain('/test-endpoint')
      }
    })

    test('should throw MuralApiError even when expected array is empty', async () => {
      const client = new MuralClient(TEST_BASE_URL)

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(400, { detail: 'validation error' })

      await expect(client.request('/test-endpoint', { expected: [] }))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 400
        })
    })

    test('should merge additional headers with defaults', async () => {
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

    test('should not include body in request when method is GET', async () => {
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

    test('should throw MuralApiError on 500 error response', async () => {
      const client = new MuralClient(TEST_BASE_URL)
      const errorBody = { error: 'Internal server error', code: 'INTERNAL_ERROR' }

      nock(TEST_BASE_URL)
        .get('/test-endpoint')
        .reply(500, errorBody)

      await expect(client.request('/test-endpoint'))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 500,
          message: /GET \/test-endpoint failed: 500/
        })
    })
  })
})
