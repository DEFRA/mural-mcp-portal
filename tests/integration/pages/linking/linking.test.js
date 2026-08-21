import nock from 'nock'
import { createServer } from '../../../../src/server/server.js'
import { loginAsDevUser } from '../../helpers/login.js'

const MURAL_MCP_URL = 'http://localhost:8086'

describe('#linkingController', () => {
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
      test('should render the page with status unavailable on API error', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(500, { error: 'Internal server error' })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toMatch(/error|try again|retry/i)
      })

      test('should render the page with not-connected status', async () => {
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
        expect(response.result).toMatch(/not connected|not\s+connected/i)
      })

      test('should render the page with connected status', async () => {
        nock(MURAL_MCP_URL)
          .get('/linking/status')
          .reply(200, { linked: true })

        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking',
          headers: { Cookie: authCookie }
        })

        expect(response.statusCode).toBe(200)
        expect(response.result).toMatch(/connected|mural@example\.com/i)
      })

      test('should show the connect button when not connected', async () => {
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
        expect(response.result).toMatch(/connect\s+mural|mural\s+account/i)
        expect(response.result).toContain('https://mural.co/oauth/authorize?state=abc')
      })

      test('should explain what happens when you connect when not connected', async () => {
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
      test('should redirect to login', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/account/mural-linking'
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toContain('/login')
      })
    })
  })
})
