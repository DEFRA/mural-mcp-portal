import { vi } from 'vitest'

import Hapi from '@hapi/hapi'

vi.mock('../../../../src/services/mural-linking.js')

import { DEFAULT_MURAL_LINK_REASON, MURAL_LINK_REQUIRED_SESSION_KEY } from '../../../../src/constants/mural-link-required.js'
import { isMuralLinked } from '../../../../src/services/mural-linking.js'
import { muralConnection } from '../../../../src/server/plugins/mural-connection.js'

/**
 * Boots a minimal Hapi server with the real `muralConnection` plugin
 * registered, a gated and an ungated throwaway route, and a fake identity
 * plus a fake `yar` (session) decoration stamped onto the request before
 * the plugin's `onPreHandler` extension runs - standing in for a real auth
 * strategy and the real `yar` plugin having already run.
 */
async function buildServer ({ authenticated = true } = {}) {
  const server = Hapi.server()
  const set = vi.fn()

  server.ext('onPreAuth', (request, h) => {
    if (authenticated) {
      request.auth = { isAuthenticated: true }
      request.auth.credentials = { profile: { email: 'user@example.com' } }
    }

    request.yar = { set }

    return h.continue
  })

  await server.register(muralConnection)

  server.route({
    method: 'GET',
    path: '/gated',
    options: { app: { requiresMuralLink: true, muralLinkReason: 'do the gated thing' } },
    handler: (request, h) => h.response({ muralConnected: request.app.muralConnected })
  })

  server.route({
    method: 'GET',
    path: '/gated-no-reason',
    options: { app: { requiresMuralLink: true } },
    handler: (request, h) => h.response({ muralConnected: request.app.muralConnected })
  })

  server.route({
    method: 'GET',
    path: '/ungated',
    handler: (request, h) => h.response({ muralConnected: request.app.muralConnected })
  })

  return { server, set }
}

describe('muralConnectionPlugin', () => {
  test('lets a connected request through, decorated with muralConnected', async () => {
    isMuralLinked.mockResolvedValue(true)
    const { server } = await buildServer()

    const { statusCode, result } = await server.inject({ method: 'GET', url: '/gated' })

    expect(statusCode).toBe(200)
    expect(result.muralConnected).toBe(true)
    expect(isMuralLinked).toHaveBeenCalledWith('user@example.com')
  })

  test('redirects to the connect-Mural gate page and stashes the return path and reason when not connected', async () => {
    isMuralLinked.mockResolvedValue(false)
    const { server, set } = await buildServer()

    const { statusCode, headers } = await server.inject({ method: 'GET', url: '/gated' })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/account/mural-linking/required')
    expect(set).toHaveBeenCalledWith(MURAL_LINK_REQUIRED_SESSION_KEY, {
      returnTo: '/gated',
      reason: 'do the gated thing'
    })
  })

  test('stashes a default reason when the route does not give one', async () => {
    isMuralLinked.mockResolvedValue(false)
    const { server, set } = await buildServer()

    await server.inject({ method: 'GET', url: '/gated-no-reason' })

    expect(set).toHaveBeenCalledWith(MURAL_LINK_REQUIRED_SESSION_KEY, {
      returnTo: '/gated-no-reason',
      reason: DEFAULT_MURAL_LINK_REASON
    })
  })

  test('does not check connection status on a route that does not require it', async () => {
    const { server, set } = await buildServer()

    const { statusCode, result } = await server.inject({ method: 'GET', url: '/ungated' })

    expect(statusCode).toBe(200)
    expect(result.muralConnected).toBeUndefined()
    expect(isMuralLinked).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })

  test('redirects to login when there is no authenticated user', async () => {
    const { server, set } = await buildServer({ authenticated: false })

    const { statusCode, headers } = await server.inject({ method: 'GET', url: '/gated' })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/login')
    expect(isMuralLinked).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
})
