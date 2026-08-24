import { constants as statusCodes } from 'node:http2'

import nock from 'nock'

import { mergeCookies } from '../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../helpers/login.js'

const { createServer } = await import('../../../../../src/server/server.js')

const MURAL_MCP_URL = 'http://localhost:8086'
const VALID_REASON = 'Need this board to run a team retrospective'

function form (fields) {
  return new URLSearchParams(fields).toString()
}

function mockLinkingStatus (linked) {
  nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked })
}

describe('#confirmationPage', () => {
  describe('when authenticated', () => {
    let server
    let cookie

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
      nock.disableNetConnect()

      cookie = await loginAsDevUser(server)
    })

    afterAll(async () => {
      nock.enableNetConnect()
      await server.stop({ timeout: 0 })
    })

    afterEach(() => {
      nock.cleanAll()
    })

    describe('GET /board-requests/new/confirmation', () => {
      test('shows pending request details after successful submission', async () => {
        mockLinkingStatus(true)
        nock(MURAL_MCP_URL).post('/approvals/boards').reply(201, { success: true, id: 'req-1' })

        const postRes = await server.inject({
          method: 'POST',
          url: '/board-requests/new',
          headers: { Cookie: cookie, 'content-type': 'application/x-www-form-urlencoded' },
          payload: form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON })
        })

        expect(postRes.statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
        expect(postRes.headers.location).toBe('/board-requests/new/confirmation')

        const getRes = await server.inject({
          method: 'GET',
          url: '/board-requests/new/confirmation',
          headers: { Cookie: mergeCookies(cookie, postRes.headers['set-cookie']) }
        })

        expect(getRes.statusCode).toBe(statusCodes.HTTP_STATUS_OK)
        expect(getRes.payload).toContain('Board request submitted')
        expect(getRes.payload).toContain('abc-123')
        expect(getRes.payload).toContain('jane.smith@defra.gov.uk')
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
