import nock from 'nock'
import { createServer } from '../../../../src/server/server.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const MURAL_MCP_URL = 'http://localhost:8086'

describe('linkingController', () => {
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

    describe('GET /account/mural-linking', () => {
      test('renders the page with status unavailable on API error', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(500, { error: 'Internal server error' })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain("We couldn't check your Mural connection status. Please try again later.")
      })

      test('renders the page with not-connected status', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(200, { linked: false })

        nock(MURAL_MCP_URL)
          .get('/linking/authorization-url')
          .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize?state=abc' })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain('Not connected')
        expect(response.result).not.toContain('Your Mural account is connected as')
      })

      test('renders the page with connected status', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(200, { linked: true })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain('Your Mural account is connected as')
        expect(response.result).toContain('dev@example.com')
        expect(response.result).not.toContain('Not connected')
        expect(response.result).not.toContain("You haven't connected a Mural account yet")
      })

      test('shows connect button when not connected', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(200, { linked: false })

        nock(MURAL_MCP_URL)
          .get('/linking/authorization-url')
          .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize?state=abc' })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toContain('Connect Mural Account')
        expect(response.result).toContain('https://mural.co/oauth/authorize?state=abc')
      })

      test('explains what happens when you connect when not connected', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(200, { linked: false })

        nock(MURAL_MCP_URL)
          .get('/linking/authorization-url')
          .reply(200, { authorizationUrl: 'https://mural.co/oauth/authorize?state=abc' })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.result).toContain('What happens when you connect')
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

    describe('GET /account/mural-linking', () => {
      test('redirects to sign in', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking'
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe('/')
      })
    })
  })
})
