import { constants as statusCodes } from 'node:http2'

import { createServer } from '../../../../src/server/server.js'
import { loginAsDevUser } from '../../../helpers/login.js'

describe('loginController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('When logged in as a dev user', () => {
    test('redirects to home page when already logged in', async () => {
      const cookie = await loginAsDevUser(server)

      const { headers, statusCode } = await server.inject({
        method: 'GET',
        url: '/login',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/')
    })
  })

  describe('When not logged in', () => {
    test('returns 200 and renders the login page', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/login'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Sign in to the Mural MCP Portal')
    })

    // Regression test for a bug where `views.js` passed Blankie's whole
    // `{ script, style }` nonce object as `cspNonce`, rendering a literal
    // `nonce="[object Object]"` on every page. The inline script kept working
    // only because the sha256 hash in content-security-policy.js separately
    // allowlists it - the nonce itself was inert. Comparing the two nonces
    // extracted from the same response is what makes this discriminating: a
    // test that only checked the attribute was present would have passed
    // against "[object Object]" all along, which is how the bug survived.
    test('renders the same nonce in the inline script as the CSP header names for script-src', async () => {
      const { headers, payload } = await server.inject({
        method: 'GET',
        url: '/login'
      })

      const [, headerNonce] = headers['content-security-policy'].match(
        /script-src[^;]*'nonce-([a-f0-9]+)'/
      )
      const [, renderedNonce] = payload.match(/<script nonce="([^"]+)">/)

      expect(renderedNonce).toBe(headerNonce)
    })
  })

  describe('handleLoginCallback', () => {
    test('establishes a session and redirects to home when using the local provider', async () => {
      const callback = await server.inject({
        method: 'GET',
        url: '/login/callback'
      })

      expect(callback.statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(callback.headers.location).toBe('/')

      const cookie = (callback.headers['set-cookie'] ?? [])
        .map((c) => c.split(';')[0])
        .join('; ')
      expect(cookie).not.toBe('')

      // Confirms the dev-session profile was actually stored against the
      // session (not just that a cookie was set) - it flows through to the
      // shared layout's header on the next request.
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Dev User')
    })
  })

  describe('logout', () => {
    test('ends the session and redirects to home when authenticated', async () => {
      const cookie = await loginAsDevUser(server)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/logout',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/')

      // Confirms the cached session was actually dropped, not just the
      // cookie cleared client-side - reusing the original cookie should now
      // be treated as unauthenticated.
      const reuse = await server.inject({
        method: 'GET',
        url: '/',
        headers: { cookie }
      })

      expect(reuse.statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(reuse.headers.location).toBe('/login')
    })

    test('redirects to home without requiring a session when unauthenticated', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/logout'
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/')
    })
  })
})
