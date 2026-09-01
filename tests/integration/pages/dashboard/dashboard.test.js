import nock from 'nock'

import { createServer } from '../../../../src/server/server.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const MURAL_MCP_URL = 'http://localhost:8086'

describe('dashboardController', () => {
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

    describe('GET /dashboard', () => {
      test('renders tile links to My approvals and Request a board', async () => {
        nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked: true })

        const response = await server.inject({
          method: 'GET',
          url: '/dashboard',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain('href="/approvals"')
        expect(response.result).toContain('href="/board-requests/new"')
      })

      test('shows the connected status when Mural is linked', async () => {
        nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked: true })

        const response = await server.inject({
          method: 'GET',
          url: '/dashboard',
          headers: { Cookie: authCookie }
        })

        expect(response.result).toContain('Connected')
        expect(response.result).not.toContain('Mural account not connected')
      })

      test('shows the not-connected status with a link to connect when Mural is not linked', async () => {
        nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked: false })
        nock(MURAL_MCP_URL)
          .get('/linking/authorization-url')
          .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize?state=abc' })

        const response = await server.inject({
          method: 'GET',
          url: '/dashboard',
          headers: { Cookie: authCookie }
        })

        expect(response.result).toContain('Mural account not connected')
        expect(response.result).toContain('href="/account/mural-linking"')
      })

      test('degrades gracefully when the Mural status check fails', async () => {
        nock(MURAL_MCP_URL).get('/linking/status').reply(500, { error: 'Internal server error' })

        const response = await server.inject({
          method: 'GET',
          url: '/dashboard',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain("We couldn't check your Mural connection status. Please try again later.")
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

    test('GET /dashboard redirects to sign in', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/')
    })
  })
})
