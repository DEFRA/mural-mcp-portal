import { constants as statusCodes } from 'node:http2'

import { loginAsDevUser } from '../../helpers/login.js'

const { createServer } = await import('../../../../src/server/server.js')

describe('#homepageController', () => {
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

    test('should respond with 200 and render the home page', async () => {
      const { statusCode, payload } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { Cookie: cookie }
      })

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Mural MCP Portal')
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

    test('should redirect to the login page', async () => {
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
