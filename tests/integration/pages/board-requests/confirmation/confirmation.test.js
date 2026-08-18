import { constants as statusCodes } from 'node:http2'

import { mergeCookies } from '../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const { createServer } = await import('../../../../../src/server/server.js')

function form (fields) {
  return new URLSearchParams(fields).toString()
}

async function seedMuralConnection (server, cookie) {
  const res = await server.inject({ method: 'GET', url: '/dev/mural-connect', headers: { Cookie: cookie } })
  return mergeCookies(cookie, res.headers['set-cookie'])
}

describe('#confirmationPage', () => {
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

    describe('GET /board-requests/new/confirmation', () => {
      test('shows pending request details after successful submission', async () => {
        const muralCookie = await seedMuralConnection(server, cookie)

        const postRes = await server.inject({
          method: 'POST',
          url: '/board-requests/new',
          headers: { Cookie: muralCookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' })
        })

        const sessionCookie = mergeCookies(muralCookie, postRes.headers['set-cookie'])

        const { statusCode, payload } = await server.inject({
          method: 'GET',
          url: '/board-requests/new/confirmation',
          headers: { Cookie: sessionCookie }
        })

        expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
        expect(payload).toContain('Board request submitted')
        expect(payload).toContain('abc-123')
        expect(payload).toContain('jane.smith@defra.gov.uk')
        expect(payload).toContain('Pending')
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

    test('GET /board-requests/new/confirmation redirects to login', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/board-requests/new/confirmation'
      })

      expect(statusCode).toBe(302)
      expect(headers).toHaveProperty('location')
      expect(headers.location).toContain('/login')
    })
  })
})
