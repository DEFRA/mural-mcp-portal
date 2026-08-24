import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import Hapi from '@hapi/hapi'
import HapiCookie from '@hapi/cookie'
import nock from 'nock'

import { generateEntraJwt, getJwks, ENTRA_TEST_KID } from '../../../helpers/oidc.js'

// Not a real credential - Bell just requires the client secret to be a
// non-empty string, hence the deliberately-obvious placeholder text.
const ENTRA_TEST_FIXTURE_VALUE = 'not-a-real-value-used-only-in-tests'

/**
 * Boots a minimal Hapi server with the real `auth` plugin registered -
 * enough to observe which strategy/decoration it sets up for the currently
 * configured `AUTH_PROVIDER`, without exercising a real request (Bell/JWKS
 * do no I/O at registration time).
 */
async function buildServer () {
  const { auth } = await import('../../../../server/plugins/auth.js')

  const server = Hapi.server()

  await server.register(HapiCookie)
  await server.register(auth)

  return server
}

describe('auth', () => {
  describe('When AUTH_PROVIDER is "local"', () => {
    beforeEach(() => {
      vi.stubEnv('AUTH_PROVIDER', 'local')
      vi.resetModules()
    })

    test('does not set up the entra strategy or verifyEntraToken', async () => {
      const server = await buildServer()

      expect(server.verifyEntraToken).toBeUndefined()
      expect(() =>
        server.route({
          method: 'GET',
          path: '/uses-entra',
          options: { auth: 'entra' },
          handler: () => 'ok'
        })
      ).toThrow(/Unknown authentication strategy entra/)
    })
  })

  describe('When AUTH_PROVIDER is "entra"', () => {
    beforeEach(() => {
      vi.stubEnv('AUTH_PROVIDER', 'entra')
      vi.stubEnv('ENTRA_TENANT_ID', ENTRA_TEST_FIXTURE_VALUE)
      vi.stubEnv('ENTRA_CLIENT_ID', ENTRA_TEST_FIXTURE_VALUE)
      vi.stubEnv('ENTRA_CLIENT_SECRET', ENTRA_TEST_FIXTURE_VALUE)
      vi.stubEnv('ENTRA_REDIRECT_HOST', 'http://localhost:3000')
      vi.resetModules()
    })

    test('sets up the entra strategy and verifyEntraToken', async () => {
      const server = await buildServer()

      expect(typeof server.verifyEntraToken).toBe('function')
      expect(() =>
        server.route({
          method: 'GET',
          path: '/uses-entra',
          options: { auth: 'entra' },
          handler: () => 'ok'
        })
      ).not.toThrow()
    })

    describe('server.verifyEntraToken', () => {
      beforeEach(() => {
        nock.disableNetConnect()
      })

      afterEach(() => {
        nock.cleanAll()
        nock.enableNetConnect()
      })

      test('resolves with the decoded payload for a validly-signed token with matching kid, aud and iss', async () => {
        const server = await buildServer()
        const token = generateEntraJwt()

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks())

        const result = await server.verifyEntraToken(token)

        expect(result).toMatchObject({
          aud: ENTRA_TEST_FIXTURE_VALUE,
          iss: `https://login.microsoftonline.com/${ENTRA_TEST_FIXTURE_VALUE}/v2.0`,
          sub: 'user-id'
        })
      })

      test('rejects when the signature does not match the resolved public key', async () => {
        const server = await buildServer()
        const token = generateEntraJwt()

        // Serve a JWKS with a different key under the same kid
        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, {
            keys: [
              {
                kty: 'RSA',
                kid: ENTRA_TEST_KID,
                use: 'sig',
                n: 'xGOr-H7A-PWLt',
                e: 'AQAB'
              }
            ]
          })

        await expect(server.verifyEntraToken(token)).rejects.toThrow()
      })

      test('rejects when the audience does not match the configured Entra client ID', async () => {
        const server = await buildServer()
        const token = generateEntraJwt({ aud: 'wrong-client-id' })

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks())

        await expect(server.verifyEntraToken(token)).rejects.toThrow()
      })

      test('rejects when the issuer does not match the configured authority/tenant', async () => {
        const server = await buildServer()
        const token = generateEntraJwt({
          iss: 'https://login.microsoftonline.com/wrong-tenant-id/v2.0'
        })

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks())

        await expect(server.verifyEntraToken(token)).rejects.toThrow()
      })

      test('rejects when the JWKS response has no key matching the token kid', async () => {
        const server = await buildServer()
        const token = generateEntraJwt({ kid: 'unknown-kid' }, { kid: 'unknown-kid' })

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks({ kid: 'different-kid' }))

        await expect(server.verifyEntraToken(token)).rejects.toThrow()
      })

      test('rejects when the JWKS endpoint returns an error', async () => {
        const server = await buildServer()
        const token = generateEntraJwt()

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(500, { error: 'Internal Server Error' })

        await expect(server.verifyEntraToken(token)).rejects.toThrow()
      })

      test('requests keys from a custom ENTRA_AUTHORITY_HOST', async () => {
        const customAuthority = 'https://custom.login.example.com'
        process.env.ENTRA_AUTHORITY_HOST = customAuthority
        vi.resetModules()

        const server = await buildServer()

        const token = generateEntraJwt({
          iss: `${customAuthority}/${ENTRA_TEST_FIXTURE_VALUE}/v2.0`
        })

        nock(customAuthority)
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks())

        const result = await server.verifyEntraToken(token)

        expect(result).toBeDefined()
        expect(result.aud).toBe(ENTRA_TEST_FIXTURE_VALUE)
      })

      test('caches JWKS keys across multiple token verifications with the same kid', async () => {
        const server = await buildServer()
        const token1 = generateEntraJwt()
        const token2 = generateEntraJwt({ sub: 'user-2' })

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .once()
          .reply(200, getJwks())

        await server.verifyEntraToken(token1)

        const result = await server.verifyEntraToken(token2)

        expect(result).toBeDefined()
        expect(result.sub).toBe('user-2')
      })

      test('rejects with expired token', async () => {
        const server = await buildServer()
        const expiredToken = generateEntraJwt({
          exp: Math.floor(Date.now() / 1000) - 3600
        })

        nock('https://login.microsoftonline.com')
          .get(`/${ENTRA_TEST_FIXTURE_VALUE}/discovery/v2.0/keys`)
          .reply(200, getJwks())

        await expect(server.verifyEntraToken(expiredToken)).rejects.toThrow()
      })

      test('rejects when token has malformed structure', async () => {
        const server = await buildServer()

        await expect(
          server.verifyEntraToken('malformed.jwt')
        ).rejects.toThrow()
      })
    })
  })
})
