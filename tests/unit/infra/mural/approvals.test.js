import { constants as statusCodes } from 'http2'

import nock from 'nock'

import { createdBoardRequest, boardRequestConflict } from '../../../fixtures/mural-mcp.js'

import {
  submitBoardRequest,
  getBoardRequest
} from '../../../../src/infra/mural/approvals.js'

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
        .post('/approvals/boards', { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', userId: 'test@example.com' })
        .reply(statusCodes.HTTP_STATUS_CREATED, responseBody)

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', userId: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(statusCodes.HTTP_STATUS_CREATED)
      expect(result.data).toEqual(responseBody)
    })

    test('sends the requester email as the X-User-Id header', async () => {
      nock(MURAL_MCP_URL)
        .matchHeader('X-User-Id', 'test@example.com')
        .post('/approvals/boards')
        .reply(statusCodes.HTTP_STATUS_CREATED, {})

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', userId: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(true)
    })

    test('returns ok:false with status 409 on conflict', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .reply(statusCodes.HTTP_STATUS_CONFLICT, boardRequestConflict())

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', userId: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(statusCodes.HTTP_STATUS_CONFLICT)
      expect(result.data).toBeNull()
    })

    test('throws on network error', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .replyWithError('ECONNREFUSED')

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', reason: 'Need this board for a workshop', userId: 'test@example.com' }

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
        .reply(statusCodes.HTTP_STATUS_OK, responseBody)

      const result = await getBoardRequest('board-abc', 'test@example.com')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(statusCodes.HTTP_STATUS_OK)
      expect(result.data).toEqual(responseBody)
    })

    test('returns ok:false with status 404 when not found', async () => {
      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(statusCodes.HTTP_STATUS_NOT_FOUND, { message: 'Not found' })

      const result = await getBoardRequest('board-abc', 'test@example.com')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(statusCodes.HTTP_STATUS_NOT_FOUND)
      expect(result.data).toBeNull()
    })

    test('throws MuralMcpError on unexpected status (500)', async () => {
      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, { message: 'Internal server error' })

      await expect(getBoardRequest('board-abc', 'test@example.com'))
        .rejects.toMatchObject({
          name: 'MuralMcpError',
          statusCode: statusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR
        })
    })

    test('URL-encodes boardId in the path', async () => {
      const responseBody = { id: 'req-1', boardId: 'board/with spaces', status: 'pending' }

      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board%2Fwith%20spaces')
        .reply(statusCodes.HTTP_STATUS_OK, responseBody)

      const result = await getBoardRequest('board/with spaces', 'test@example.com')

      expect(result.ok).toBe(true)
      expect(result.data).toEqual(responseBody)
    })
  })
})
