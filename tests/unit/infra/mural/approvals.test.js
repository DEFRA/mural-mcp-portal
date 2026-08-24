import nock from 'nock'

import { createdBoardRequest, boardRequestConflict } from '../../../fixtures/mural-mcp.js'

import {
  submitBoardRequest,
  getBoardRequest
} from '../../../../infra/mural/approvals.js'

const MURAL_MCP_URL = 'http://localhost:8086'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

describe('approvalsApi', () => {
  describe('submitBoardRequest', () => {
    test('returns ok:true with data on 201', async () => {
      const responseBody = createdBoardRequest()

      nock(MURAL_MCP_URL)
        .post('/approvals/boards', { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop' })
        .reply(201, responseBody)

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.data).toEqual(responseBody)
    })

    test('sends the requester email as the X-User-Id header', async () => {
      nock(MURAL_MCP_URL)
        .matchHeader('X-User-Id', 'test@example.com')
        .post('/approvals/boards')
        .reply(201, {})

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(true)
    })

    test('returns ok:false with status 409 on conflict', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .reply(409, boardRequestConflict())

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(409)
      expect(result.data).toBeNull()
    })

    test('throws on network error', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .replyWithError('ECONNREFUSED')

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', email: 'test@example.com' }

      await expect(
        submitBoardRequest(approvalRequest)
      ).rejects.toThrow()
    })
  })

  describe('getBoardRequest', () => {
    test('returns ok:true with data on 200', async () => {
      const responseBody = { id: 'req-1', boardId: 'board-abc', status: 'pending' }

      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(200, responseBody)

      const result = await getBoardRequest('board-abc')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(responseBody)
    })

    test('returns ok:false with status 404 when not found', async () => {
      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(404, { message: 'Not found' })

      const result = await getBoardRequest('board-abc')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
      expect(result.data).toBeNull()
    })

    test('throws MuralApiError on unexpected status (500)', async () => {
      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(500, { message: 'Internal server error' })

      await expect(getBoardRequest('board-abc'))
        .rejects.toMatchObject({
          name: 'MuralApiError',
          statusCode: 500
        })
    })

    test('URL-encodes boardId in the path', async () => {
      const responseBody = { id: 'req-1', boardId: 'board/with spaces', status: 'pending' }

      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board%2Fwith%20spaces')
        .reply(200, responseBody)

      const result = await getBoardRequest('board/with spaces')

      expect(result.ok).toBe(true)
      expect(result.data).toEqual(responseBody)
    })
  })
})
