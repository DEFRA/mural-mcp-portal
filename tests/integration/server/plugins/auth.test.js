import { randomUUID } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import Hapi from '@hapi/hapi'
import HapiCookie from '@hapi/cookie'
import nock from 'nock'

import { generateEntraJwt } from '../../../helpers/oidc.js'

// Not a real credential - Bell just requires the client secret to be a
// non-empty string, hence the deliberately-obvious placeholder text.
const ENTRA_TEST_FIXTURE_VALUE = 'not-a-real-value-used-only-in-tests'

/**
 * Boots a real Hapi server with the 'session' auth strategy wired up exactly
 * as it is in the app (auth plugin plus a real cache engine), plus two
 * throwaway routes so `_validateSessionToken` can be exercised end-to-end
 * via `server.inject` rather than exported and unit tested directly.
 */
async function buildServerWithSession () {
  const { auth } = await import('../../../../src/server/plugins/auth.js')
  const { getCacheEngine } = await import('../../../../src/server/plugins/session-cache/cache-engine.js')
  const { config } = await import('../../../../src/config/config.js')

  const server = Hapi.server({
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ]
  })

  server.decorate('server', 'logger', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

  server.app.cache = server.cache({
    cache: config.get('session.cache.name'),
    segment: 'auth-session',
    expiresIn: config.get('session.cache.ttl')
  })

  await server.register(HapiCookie)
  await server.register(auth)

  // Mimics the relevant part of the real `/login/callback` handler (see
  // `pages/login/controller.js`) closely enough to populate a real session,
  // without pulling in the whole login page/router just to authenticate a
  // test request. Omitting `token` reproduces a cookieAuth cookie that has
  // outlived its cached session data (e.g. the cache entry expired or was
  // evicted independently of the cookie).
  server.route({
    method: 'GET',
    path: '/test-login',
    options: { auth: false },
    handler: async (request) => {
      const sessionId = randomUUID()

      if (request.query.token) {
        await request.server.app.cache.set(`auth-session:${sessionId}`, {
          token: request.query.token,
          refreshToken: request.query.refreshToken,
          profile: { id: 'user-123' }
        })
      }

      request.cookieAuth.set({ sessionId })

      return 'ok'
    }
  })

  server.route({
    method: 'GET',
    path: '/protected',
    options: { auth: 'session' },
    handler: (request) => request.auth.credentials
  })

  await server.initialize()

  return server
}

/**
 * Logs in to a `buildServerWithSession` server and returns a `Cookie` header
 * value carrying the authenticated session, for use in a subsequent
 * `server.inject` call. Omit `token` to set the cookieAuth cookie without a
 * corresponding cached session.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} [token]
 * @param {string} [refreshToken]
 * @returns {Promise<string>}
 */
async function loginWithToken (server, token, refreshToken) {
  const params = new URLSearchParams()

  if (token) {
    params.append('token', token)
  }

  if (refreshToken) {
    params.append('refreshToken', refreshToken)
  }

  const query = params.size ? `?${params.toString()}` : ''

  const response = await server.inject({
    method: 'GET',
    url: `/test-login${query}`
  })

  return (response.headers['set-cookie'] ?? [])
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

describe('auth', () => {
  describe('when session auth strategy is used', () => {
    let server

    beforeEach(async () => {
      server = await buildServerWithSession()
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
    })

    test('redirects to /login when the request has no session', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected'
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
    })

    test('redirects to /login when the session cookie is valid but has no stored userAuth', async () => {
      const cookie = await loginWithToken(server)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
    })

    test('authenticates the request when the session holds a non-expired token', async () => {
      const token = generateEntraJwt()
      const cookie = await loginWithToken(server, token)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        token,
        profile: { id: 'user-123' },
        sessionId: expect.any(String)
      })
    })

    test('redirects to /login and logs when the session token has expired and refresh tokens are disabled', async () => {
      const expiredToken = generateEntraJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
      const cookie = await loginWithToken(server, expiredToken)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
      expect(server.logger.warn).toHaveBeenCalledWith(
        { type: 'entra_token_expired', error: expect.any(Error) },
        'Session token invalid and cannot be refreshed'
      )
    })
  })

  describe('when session auth strategy is used with ENTRA_USE_REFRESH_TOKENS overridden to true', () => {
    let server

    beforeEach(async () => {
      vi.stubEnv('ENTRA_USE_REFRESH_TOKENS', 'true')
      vi.stubEnv('ENTRA_TENANT_ID', ENTRA_TEST_FIXTURE_VALUE)
      vi.stubEnv('ENTRA_CLIENT_ID', ENTRA_TEST_FIXTURE_VALUE)
      vi.stubEnv('ENTRA_CLIENT_SECRET', ENTRA_TEST_FIXTURE_VALUE)
      vi.resetModules()

      server = await buildServerWithSession()
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
      nock.cleanAll()
    })

    test('refreshes the expired session token and authenticates the request', async () => {
      const expiredToken = generateEntraJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
      const cookie = await loginWithToken(server, expiredToken, 'old-refresh-token')

      const refreshScope = nock('https://login.microsoftonline.com')
        .post(`/${ENTRA_TEST_FIXTURE_VALUE}/oauth2/v2.0/token`, (body) => {
          const params = new URLSearchParams(body)

          return params.get('client_id') === ENTRA_TEST_FIXTURE_VALUE &&
            params.get('client_secret') === ENTRA_TEST_FIXTURE_VALUE &&
            params.get('grant_type') === 'refresh_token' &&
            params.get('scope') === 'User.Read openid profile email offline_access' &&
            params.get('refresh_token') === 'old-refresh-token'
        })
        .reply(200, { access_token: 'new-access-token', refresh_token: 'new-refresh-token' })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(200)
      expect(refreshScope.isDone()).toBe(true)

      expect(result).toMatchObject({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
        profile: { id: 'user-123' },
        sessionId: expect.any(String)
      })
    })

    test('redirects to /login when refreshing the expired session token fails', async () => {
      const expiredToken = generateEntraJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
      const cookie = await loginWithToken(server, expiredToken, 'old-refresh-token')

      nock('https://login.microsoftonline.com')
        .post(`/${ENTRA_TEST_FIXTURE_VALUE}/oauth2/v2.0/token`)
        .reply(400, { error: 'invalid_grant' })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
    })

    test('does not attempt to refresh a session token that has not expired', async () => {
      const token = generateEntraJwt()
      const cookie = await loginWithToken(server, token, 'old-refresh-token')

      const refreshScope = nock('https://login.microsoftonline.com')
        .post(`/${ENTRA_TEST_FIXTURE_VALUE}/oauth2/v2.0/token`)
        .reply(200, { access_token: 'new-access-token', refresh_token: 'new-refresh-token' })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(200)
      expect(result.token).toBe(token)
      expect(refreshScope.isDone()).toBe(false)
    })

    test('redirects to /login without calling the token endpoint when the session has no refresh token', async () => {
      const expiredToken = generateEntraJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
      const cookie = await loginWithToken(server, expiredToken)

      const refreshScope = nock('https://login.microsoftonline.com')
        .post(`/${ENTRA_TEST_FIXTURE_VALUE}/oauth2/v2.0/token`)
        .reply(200, { access_token: 'new-access-token', refresh_token: 'new-refresh-token' })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
      expect(refreshScope.isDone()).toBe(false)
      expect(server.logger.warn).toHaveBeenCalledWith(
        { type: 'entra_token_expired', error: expect.any(Error) },
        'Session token invalid and cannot be refreshed'
      )
    })
  })

  // ENTRA_USE_REFRESH_TOKENS is an Entra-only concern, but nothing stops it
  // being left set while AUTH_PROVIDER is 'local'. Local sessions carry no
  // refresh token (and no tenant/client to spend it against), so the refresh
  // path must not run for them.
  describe('when AUTH_PROVIDER is "local" and ENTRA_USE_REFRESH_TOKENS is true', () => {
    let server

    beforeEach(async () => {
      vi.stubEnv('AUTH_PROVIDER', 'local')
      vi.stubEnv('ENTRA_USE_REFRESH_TOKENS', 'true')
      vi.stubEnv('ENTRA_TENANT_ID', undefined)
      vi.stubEnv('ENTRA_CLIENT_ID', undefined)
      vi.stubEnv('ENTRA_CLIENT_SECRET', undefined)
      vi.resetModules()

      nock.disableNetConnect()

      server = await buildServerWithSession()
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
      nock.cleanAll()
      nock.enableNetConnect()
    })

    test('redirects to /login without any outbound request when the session token has expired', async () => {
      const expiredToken = generateEntraJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
      const cookie = await loginWithToken(server, expiredToken)

      const requests = []

      nock.emitter.on('no match', (request) => requests.push(request))

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/protected',
        headers: { cookie }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/login')
      expect(requests).toHaveLength(0)

      nock.emitter.removeAllListeners('no match')
    })
  })
})
