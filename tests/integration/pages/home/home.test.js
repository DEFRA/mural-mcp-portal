import { constants as statusCodes } from 'node:http2'

import { loginAsDevUser } from '../../../helpers/login.js'

// The footer link is the only place `aceSlackChannel` surfaces, and its config
// default is a bare '#'. Set a distinctive value - before the server (and so
// config) is loaded - so the assertion below cannot pass on the default.
const ACE_SLACK_CHANNEL = 'https://defra.slack.com/archives/C0ASKACE'
process.env.ACE_SLACK_CHANNEL_URL = ACE_SLACK_CHANNEL

const { createServer } = await import('../../../../server/server.js')

describe('homepageController', () => {
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

    test('returns 200 and renders the home page', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { Cookie: cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('RPA Guidance AI Usecase PoC')
    })

    // The shared view context (`server/plugins/views.js`) is asserted here, as
    // rendered HTML, rather than by inspecting the context object. `userEmail`
    // is the one field no page in this layout renders - it is asserted where it
    // does render, in `pages/linking/linking.test.js`.
    test('renders the shared view context into the layout', async () => {
      const { payload } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { Cookie: cookie }
      })

      // serviceName
      expect(payload).toContain(
        '<a href="/" class="defra-header__service-name">Mural MCP Portal</a>'
      )

      // aceSlackChannel
      expect(payload).toContain(`href="${ACE_SLACK_CHANNEL}">#ask-ace</a>`)

      // cspNonce, on the inline script GOV.UK Frontend's template emits
      expect(payload).toContain('<script nonce=')

      // getAssetPath, resolved through the Vite manifest
      expect(payload).toMatch(
        /href="\/public\/assets\/applicationCss-[\w-]+\.css" rel="stylesheet"/
      )
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

    test('redirects to the login page when unauthenticated', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(statusCode).toBe(302)
      expect(headers).toHaveProperty('location')
      expect(headers.location).toContain('/login')
    })
  })
})
