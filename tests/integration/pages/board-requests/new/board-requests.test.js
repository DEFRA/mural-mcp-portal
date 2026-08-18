import { constants as statusCodes } from 'node:http2'

import { mergeCookies } from '../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const { createServer } = await import('../../../../../src/server/server.js')

function form (fields) {
  return new URLSearchParams(fields).toString()
}

async function seedMuralConnection (server, cookie) {
  const res = await server.inject({ method: 'GET', url: '/dev/mural-connect', headers: { Cookie: cookie } })
  return mergeCookies(cookie, res.headers['set-cookie'])
}

describe('#boardRequestsController', () => {
  describe('when authenticated', () => {
    let server
    let cookie

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()

      cookie = await loginAsDevUser(server)
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    describe('GET /board-requests/new', () => {
      test('redirects to home when Mural connection is not set', async () => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
        expect(headers.location).toBe('/')
      })

      test('renders the form with Board ID and IAO fields when connected', async () => {
        const muralCookie = await seedMuralConnection(server, cookie)

        const { statusCode, payload } = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: muralCookie }
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
        expect(payload).toContain('Board ID')
        expect(payload).toContain('Information Asset Owner')
        expect(payload).toContain('name="boardId"')
        expect(payload).toContain('name="iao"')
      })
    })

    describe('POST /board-requests/new', () => {
      describe('Mural connection guard', () => {
        test('redirects to home when Mural connection is not set', async () => {
          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
          expect(headers.location).toBe('/')
        })
      })

      describe('Validation', () => {
        test('shows error for Board ID when empty', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: '', iao: 'jane.smith@defra.gov.uk' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter a Board ID')
        })

        test('shows error for IAO when empty', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: '' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter an Information Asset Owner email address')
        })

        test('shows both errors and error summary when both fields are empty', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: '', iao: '' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('There is a problem')
          expect(payload).toContain('Enter a Board ID')
          expect(payload).toContain('Enter an Information Asset Owner email address')
        })

        test('shows error when IAO is not a valid email address', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'not-an-email' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter a valid email address for the Information Asset Owner')
        })

        test('shows error when IAO is not a defra.gov.uk address', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane@example.com' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Information Asset Owner must be a defra.gov.uk email address')
        })

        test('re-populates valid field values on failure', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: '' })
          })

          expect(payload).toContain('value="abc-123"')
        })
      })

      describe('Successful submission', () => {
        test('redirects to confirmation when both fields are valid', async () => {
          const muralCookie = await seedMuralConnection(server, cookie)

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
          expect(headers.location).toBe('/board-requests/new/confirmation')
        })
      })
    })
  })

  describe('when unauthenticated', () => {
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('GET /board-requests/new redirects to login', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/board-requests/new'
      })

      expect(statusCode).toBe(302)
      expect(headers).toHaveProperty('location')
      expect(headers.location).toContain('/login')
    })

    test('POST /board-requests/new redirects to login', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/board-requests/new',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
      })

      expect(statusCode).toBe(302)
      expect(headers).toHaveProperty('location')
      expect(headers.location).toContain('/login')
    })
  })
})
