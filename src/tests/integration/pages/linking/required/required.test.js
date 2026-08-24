import nock from 'nock'

import { mergeCookies } from '../../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../../helpers/login.js'

const { createServer } = await import('../../../../../server/server.js')

const MURAL_MCP_URL = 'http://localhost:8086'

function mockLinkingStatus (linked) {
  nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked })
}

describe('muralLinkRequiredController', () => {
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

    describe('GET /account/mural-linking/required', () => {
      test('redirects to the general linking page when reached without gate context', async () => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: '/account/mural-linking/required',
          headers: { Cookie: cookie }
        })

        expect(statusCode).toBe(302)
        expect(headers.location).toBe('/account/mural-linking')
      })

      test('sends the user back to what they were doing once already connected', async () => {
        mockLinkingStatus(false)

        const gatedResponse = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })

        expect(gatedResponse.headers.location).toBe('/account/mural-linking/required')
        const sessionCookie = mergeCookies(cookie, gatedResponse.headers['set-cookie'])

        mockLinkingStatus(true)

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: '/account/mural-linking/required',
          headers: { Cookie: sessionCookie }
        })

        expect(statusCode).toBe(302)
        expect(headers.location).toBe('/board-requests/new')
      })

      test('treats a failed status check as not connected and shows the gate content', async () => {
        nock(MURAL_MCP_URL).get('/linking/status').reply(500, { error: 'Internal server error' })

        const gatedResponse = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })
        const sessionCookie = mergeCookies(cookie, gatedResponse.headers['set-cookie'])

        nock(MURAL_MCP_URL).get('/linking/status').reply(500, { error: 'Internal server error' })

        const { statusCode, payload } = await server.inject({
          method: 'GET',
          url: '/account/mural-linking/required',
          headers: { Cookie: sessionCookie }
        })

        expect(statusCode).toBe(200)
        expect(payload).toContain("You tried to request a new Mural board, but this service isn't connected to your Mural account yet.")
      })

      test('links to the general linking page to actually connect', async () => {
        mockLinkingStatus(false)

        const gatedResponse = await server.inject({
          method: 'GET',
          url: '/board-requests/new',
          headers: { Cookie: cookie }
        })
        const sessionCookie = mergeCookies(cookie, gatedResponse.headers['set-cookie'])

        const { payload } = await server.inject({
          method: 'GET',
          url: '/account/mural-linking/required',
          headers: { Cookie: sessionCookie }
        })

        expect(payload).toContain('href="/account/mural-linking"')
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

    test('GET /account/mural-linking/required redirects to login', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/account/mural-linking/required'
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toContain('/login')
    })
  })
})
