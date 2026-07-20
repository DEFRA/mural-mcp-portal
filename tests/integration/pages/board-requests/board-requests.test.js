import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'

function extractCookies (setCookieHeader) {
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

async function seedMuralConnection (server) {
  const res = await server.inject({ method: 'GET', url: '/dev/mural-connect' })
  return extractCookies(res.headers['set-cookie'])
}

describe('#boardRequestsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /board-requests/new', () => {
    test('redirects to home when Mural connection is not set (AC5)', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/board-requests/new'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/')
    })

    test('renders the form with Board ID and IAO fields when connected (AC1)', async () => {
      const cookie = await seedMuralConnection(server)

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/board-requests/new',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Board ID')
      expect(payload).toContain('Information Asset Owner')
      expect(payload).toContain('name="boardId"')
      expect(payload).toContain('name="iao"')
    })
  })

  describe('POST /board-requests', () => {
    describe('Mural connection guard', () => {
      test('redirects to home when Mural connection is not set (AC5)', async () => {
        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao=jane.smith%40defra.gov.uk'
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
        expect(headers.location).toBe('/')
      })
    })

    describe('Validation', () => {
      test('shows error for Board ID when empty (AC3)', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=&iao=jane.smith%40defra.gov.uk'
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
        expect(payload).toContain('Enter a Board ID')
      })

      test('shows error for IAO when empty (AC4)', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao='
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
        expect(payload).toContain('Enter an Information Asset Owner email address')
      })

      test('shows both errors and error summary when both fields are empty (AC3, AC4)', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=&iao='
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
        expect(payload).toContain('There is a problem')
        expect(payload).toContain('Enter a Board ID')
        expect(payload).toContain('Enter an Information Asset Owner email address')
      })

      test('shows error when IAO is not a valid email address', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao=not-an-email'
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
        expect(payload).toContain('Enter a valid email address for the Information Asset Owner')
      })

      test('shows error when IAO is not a defra.gov.uk address', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao=jane%40example.com'
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
        expect(payload).toContain('Information Asset Owner must be a defra.gov.uk email address')
      })

      test('re-populates valid field values on failure', async () => {
        const cookie = await seedMuralConnection(server)

        const { payload } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao='
        })

        expect(payload).toContain('value="abc-123"')
      })
    })

    describe('Successful submission', () => {
      test('redirects to confirmation when both fields are valid (AC2, AC6)', async () => {
        const cookie = await seedMuralConnection(server)

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: '/board-requests',
          headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: 'boardId=abc-123&iao=jane.smith%40defra.gov.uk'
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
        expect(headers.location).toBe('/board-requests/confirmation')
      })
    })
  })

  describe('GET /board-requests/confirmation', () => {
    test('shows pending request details after successful submission (AC6)', async () => {
      const cookie = await seedMuralConnection(server)

      const postRes = await server.inject({
        method: 'POST',
        url: '/board-requests',
        headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'boardId=abc-123&iao=jane.smith%40defra.gov.uk'
      })

      const sessionCookie = postRes.headers['set-cookie']
        ? extractCookies(postRes.headers['set-cookie'])
        : cookie

      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/board-requests/confirmation',
        headers: { cookie: sessionCookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Board request submitted')
      expect(payload).toContain('abc-123')
      expect(payload).toContain('jane.smith@defra.gov.uk')
      expect(payload).toContain('Pending')
    })
  })
})
