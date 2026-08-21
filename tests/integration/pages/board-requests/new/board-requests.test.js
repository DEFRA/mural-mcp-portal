import { constants as statusCodes } from 'node:http2'

import nock from 'nock'

import { mergeCookies } from '../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const { createServer } = await import('../../../../../src/server/server.js')

const MURAL_MCP_URL = 'http://localhost:8086'

function form (fields) {
  return new URLSearchParams(fields).toString()
}

function mockLinkingStatus (linked) {
  nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked })
}

describe('#boardRequestsController', () => {
  describe('when authenticated', () => {
    let server
    let cookie

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
      nock.disableNetConnect()

      cookie = await loginAsDevUser(server)
    })

    afterAll(async () => {
      nock.enableNetConnect()
      await server.stop({ timeout: 0 })
    })

    afterEach(() => {
      nock.cleanAll()
    })

    describe('GET /board-requests/new', () => {
      test('redirects to the connect-Mural gate page when Mural connection is not set', async () => {
        mockLinkingStatus(false)

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
        expect(headers.location).toBe('/account/mural-linking/required')
      })

      test('renders the form when connected', async () => {
        mockLinkingStatus(true)

        const { statusCode, payload } = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
        expect(payload).toContain('<form')
      })
    })

    describe('POST /board-requests/new', () => {
      describe('Mural connection guard', () => {
        test('redirects to the connect-Mural gate page when Mural connection is not set', async () => {
          mockLinkingStatus(false)

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
          expect(headers.location).toBe('/account/mural-linking/required')
        })

        test('gate page explains what was being attempted and links to the linking page', async () => {
          mockLinkingStatus(false)

          const postRes = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
          })

          const sessionCookie = mergeCookies(cookie, postRes.headers['set-cookie'])

          mockLinkingStatus(false)

          const { statusCode, payload } = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/required',
            headers: { Cookie: sessionCookie }
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
          expect(payload).toContain("You tried to request a new Mural board, but this service isn't connected to your Mural account yet.")
          expect(payload).toContain('href="/account/mural-linking"')
        })
      })

      describe('Validation', () => {
        test('shows error for Board ID when empty', async () => {
          mockLinkingStatus(true)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: '', iao: 'jane.smith@defra.gov.uk' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter a Board ID')
        })

        test('shows error for IAO when empty', async () => {
          mockLinkingStatus(true)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: '' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter an Information Asset Owner email address')
        })

        test('shows both errors and error summary when both fields are empty', async () => {
          mockLinkingStatus(true)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: '', iao: '' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('There is a problem')
          expect(payload).toContain('Enter a Board ID')
          expect(payload).toContain('Enter an Information Asset Owner email address')
        })

        test('shows error when IAO is not a valid email address', async () => {
          mockLinkingStatus(true)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'not-an-email' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Enter a valid email address for the Information Asset Owner')
        })

        test('shows error when IAO is not a defra.gov.uk address', async () => {
          mockLinkingStatus(true)

          const { statusCode, payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: 'jane@example.com' })
          })

          expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
          expect(payload).toContain('Information Asset Owner must be a defra.gov.uk email address')
        })

        test('re-populates valid field values on failure', async () => {
          mockLinkingStatus(true)

          const { payload } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
            payload: form({ boardId: 'abc-123', iao: '' })
          })

          expect(payload).toContain('value="abc-123"')
        })
      })

      describe('Successful submission', () => {
        test('redirects to confirmation when both fields are valid', async () => {
          mockLinkingStatus(true)

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: '/board-requests/new',
            headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
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
