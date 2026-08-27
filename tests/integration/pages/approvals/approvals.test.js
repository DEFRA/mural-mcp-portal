import nock from 'nock'

import { createServer } from '../../../../src/server/server.js'
import { loginAsDevUser } from '../../../helpers/login.js'

describe('approvalsController', () => {
  describe('when authenticated', () => {
    let server
    let authCookie

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
      // No interceptor is registered for this test - if the route called the
      // Mural API (i.e. `requiresMuralLink` was mistakenly added) this would
      // fail with an unmocked-request error rather than silently passing.
      nock.disableNetConnect()

      authCookie = await loginAsDevUser(server)
    })

    afterAll(async () => {
      nock.enableNetConnect()
      await server.stop({ timeout: 0 })
    })

    test('GET /approvals renders the coming-soon page without requiring a Mural link', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/approvals',
        headers: { Cookie: authCookie }
      })

      expect(response.statusCode).toBe(200)
      expect(response.result).toContain('My approvals')
      expect(response.result).toContain('This feature is coming soon.')
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

    test('GET /approvals redirects to sign in', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/approvals'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/')
    })
  })
})
