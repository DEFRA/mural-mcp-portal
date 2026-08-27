import { constants as statusCodes } from 'node:http2'

import nock from 'nock'

import { createdBoardRequest, boardRequestConflict } from '../../../../fixtures/mural-mcp.js'
import { mergeCookies } from '../../../../helpers/cookies.js'
import { loginAsDevUser } from '../../../../helpers/login.js'
import { get, post } from '../../../../helpers/server.js'
import { form } from '../../../../helpers/forms.js'

const { createServer } = await import('../../../../../src/server/server.js')

const MURAL_MCP_URL = 'http://localhost:8086'

const VALID_REASON = 'Need this board to run a team retrospective'

function mockLinkingStatus (linked) {
  nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked })
}

function mockApprovalSubmission (status, body = {}) {
  nock(MURAL_MCP_URL).post('/approvals/boards').reply(status, body)
}

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

  describe('when Mural is not connected', () => {
    beforeEach(() => {
      mockLinkingStatus(false)
    })

    test('GET /board-requests/new redirects to the connect-Mural gate page', async () => {
      const { statusCode, headers } = await get(server, '/board-requests/new', cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/account/mural-linking/required')
    })

    test('POST /board-requests/new redirects to the connect-Mural gate page', async () => {
      const { statusCode, headers } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/account/mural-linking/required')
    })

    test('the connect-Mural gate page explains what was being attempted and links to the linking page', async () => {
      const postRes = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      const sessionCookie = mergeCookies(cookie, postRes.headers['set-cookie'])

      // The gate page re-checks the status when it renders, so it needs an
      // interceptor of its own beyond the one the POST above consumed.
      mockLinkingStatus(false)

      const { statusCode, payload } = await get(server, '/account/mural-linking/required', sessionCookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain("You tried to request a new Mural board, but this service isn't connected to your Mural account yet.")
      expect(payload).toContain('href="/account/mural-linking"')
    })
  })

  describe('when Mural is connected', () => {
    beforeEach(() => {
      mockLinkingStatus(true)
    })

    test('GET /board-requests/new renders the form', async () => {
      const { statusCode, payload } = await get(server, '/board-requests/new', cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_OK)
      expect(payload).toContain('Board ID')
      expect(payload).toContain('Information Asset Owner')
      expect(payload).toContain('Reason for requesting this board')
      expect(payload).toContain('name="boardId"')
      expect(payload).toContain('name="iao"')
      expect(payload).toContain('name="reason"')
    })

    test('POST /board-requests/new shows an error for Board ID when empty', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: '', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Enter a Board ID')
    })

    test('POST /board-requests/new shows an error for IAO when empty', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: '', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Enter an Information Asset Owner email address')
    })

    test('POST /board-requests/new shows all errors and an error summary when every field is empty', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: '', iao: '', reason: '' }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('There is a problem')
      expect(payload).toContain('Enter a Board ID')
      expect(payload).toContain('Enter an Information Asset Owner email address')
      expect(payload).toContain('Enter a reason for requesting this Mural board')
    })

    test('POST /board-requests/new shows an error when IAO is not a valid email address', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'not-an-email', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Enter a valid email address for the Information Asset Owner')
    })

    test('POST /board-requests/new shows an error when IAO is not a defra.gov.uk address', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane@example.com', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Information Asset Owner must be a defra.gov.uk email address')
    })

    test('POST /board-requests/new shows an error for reason when empty', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: '' }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Enter a reason for requesting this Mural board')
    })

    test('POST /board-requests/new shows an error when reason is shorter than 10 characters', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: 'too short' }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Reason must be at least 10 characters')
    })

    test('POST /board-requests/new shows an error when reason is longer than 255 characters', async () => {
      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: 'a'.repeat(256) }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_BAD_REQUEST)
      expect(payload).toContain('Reason must be at most 255 characters')
    })

    test('POST /board-requests/new re-populates valid field values on failure', async () => {
      const { payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: '', reason: VALID_REASON }), cookie)

      expect(payload).toContain('value="abc-123"')
      expect(payload).toContain(VALID_REASON)
    })

    test('POST /board-requests/new redirects to confirmation when the API accepts the request', async () => {
      mockApprovalSubmission(statusCodes.HTTP_STATUS_CREATED, createdBoardRequest({ boardId: 'abc-123' }))

      const { statusCode, headers } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_FOUND)
      expect(headers.location).toBe('/board-requests/new/confirmation')
    })

    test('POST /board-requests/new shows an error against Board ID when a request for the board already exists', async () => {
      mockApprovalSubmission(statusCodes.HTTP_STATUS_CONFLICT, boardRequestConflict())

      const { statusCode, payload } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_CONFLICT)
      expect(payload).toContain('A request for this board already exists')
      expect(payload).toContain('value="abc-123"')
    })

    test('POST /board-requests/new renders the generic error page when the API responds with an unexpected status', async () => {
      mockApprovalSubmission(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, { message: 'boom' })

      const { statusCode } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk', reason: VALID_REASON }), cookie)

      expect(statusCode).toBe(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR)
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

  test('GET /board-requests/new redirects to sign in', async () => {
    const { statusCode, headers } = await get(server, '/board-requests/new')

    expect(statusCode).toBe(302)
    expect(headers).toHaveProperty('location')
    expect(headers.location).toBe('/')
  })

  test('POST /board-requests/new redirects to sign in', async () => {
    const { statusCode, headers } = await post(server, '/board-requests/new', form({ boardId: 'abc-123', iao: 'jane.smith@defra.gov.uk' }))

    expect(statusCode).toBe(302)
    expect(headers).toHaveProperty('location')
    expect(headers.location).toBe('/')
  })
})
