import nock from 'nock'
import { createServer } from '../../../../src/server/server.js'
import { mergeCookies } from '../../helpers/cookies.js'
import { loginAsDevUser } from '../../helpers/login.js'

const MURAL_MCP_URL = 'http://localhost:8086'

describe('#linkingCallbackController', () => {
  describe('when authenticated', () => {
    let server
    let authCookie

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
      nock.disableNetConnect()
    })

    afterAll(async () => {
      nock.enableNetConnect()
      await server.stop({ timeout: 0 })
    })

    afterEach(() => {
      nock.cleanAll()
    })

    beforeEach(async () => {
      authCookie = await loginAsDevUser(server)
    })

    describe('GET /account/mural-linking/callback', () => {
      describe('with valid code and state', () => {
        test('calls backend to complete connection', async () => {
          let callMade = false
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query({ code: 'auth_code_123', state: 'state_xyz' })
            .reply(() => {
              callMade = true
              return [200, { status: 'success' }]
            })

          await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: authCookie }
          })

          expect(callMade).toBe(true)
        })

        test('redirects to linking page on success', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(200, { status: 'success' })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: authCookie }
          })

          expect(response.statusCode).toBe(302)
          expect(response.headers.location).toBe('/account/mural-linking')
        })

        test('redirects to linking page on validation error (400)', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(400, { detail: 'OAuth state mismatch' })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=invalid_state',
            headers: { Cookie: authCookie }
          })

          expect(response.statusCode).toBe(302)
          expect(response.headers.location).toBe('/account/mural-linking')
        })

        test('redirects to linking page on server error (500)', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(500, { error: 'Internal server error' })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: authCookie }
          })

          expect(response.statusCode).toBe(302)
          expect(response.headers.location).toBe('/account/mural-linking')
        })

        test('maintains session on error', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(500, { error: 'Server error' })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: authCookie }
          })

          // Session should still be valid (not expiring)
          expect(response.statusCode).toBe(302)
          const setCookieHeader = response.headers['set-cookie']
          if (setCookieHeader) {
            const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader
            expect(cookieString).not.toMatch(/expires=|Max-Age=0/)
          }
        })
      })

      describe('when user denies or request lacks code', () => {
        test('handles missing code parameter', async () => {
          // Ensure backend is not called when code is missing
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(() => {
              throw new Error('Should not have called backend')
            })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?state=state_xyz',
            headers: { Cookie: authCookie }
          })

          expect(response.statusCode).toBe(302)
          expect(response.headers.location).toBe('/account/mural-linking')
        })

        test('handles error parameter (user denied)', async () => {
          // Ensure backend is not called when error is present
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(() => {
              throw new Error('Should not have called backend')
            })

          const response = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?error=access_denied',
            headers: { Cookie: authCookie }
          })

          expect(response.statusCode).toBe(302)
          expect(response.headers.location).toBe('/account/mural-linking')
        })
      })

      describe('when redirected here from a Mural-gated page', () => {
        test('redirects back to the original destination on success, not the linking page', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/status')
            .reply(200, { linked: false })

          const gatedResponse = await server.inject({
            method: 'GET',
            url: '/board-requests/new',
            headers: { Cookie: authCookie }
          })

          expect(gatedResponse.headers.location).toBe('/account/mural-linking/required')
          const sessionCookie = mergeCookies(authCookie, gatedResponse.headers['set-cookie'])

          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(200, { status: 'success' })

          const callbackResponse = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: sessionCookie }
          })

          expect(callbackResponse.statusCode).toBe(302)
          expect(callbackResponse.headers.location).toBe('/board-requests/new')
        })
      })

      describe('two-request flow (callback then status check)', () => {
        test('status page shows connected after successful callback', async () => {
          nock(MURAL_MCP_URL)
            .get('/linking/callback')
            .query(true)
            .reply(200, { status: 'success' })
            .get('/linking/status')
            .reply(200, { linked: true })

          // First: callback request
          const callbackResponse = await server.inject({
            method: 'GET',
            url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz',
            headers: { Cookie: authCookie }
          })

          expect(callbackResponse.statusCode).toBe(302)

          // Second: subsequent request to linking page should show connected
          const linkingPageResponse = await server.inject({
            method: 'GET',
            url: '/account/mural-linking',
            headers: { Cookie: authCookie }
          })

          expect(linkingPageResponse.statusCode).toBe(200)
          expect(linkingPageResponse.result).toMatch(/connected/i)
        })
      })
    })
  })

  describe('when unauthenticated', () => {
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
      nock.disableNetConnect()
    })

    afterAll(async () => {
      nock.enableNetConnect()
      await server.stop({ timeout: 0 })
    })

    describe('GET /account/mural-linking/callback', () => {
      test('redirects to login', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking/callback?code=auth_code_123&state=state_xyz'
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toContain('/login')
      })
    })
  })
})
