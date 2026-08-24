import nock from 'nock'

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

describe('#approvalsApi', () => {
  describe('submitBoardRequest', () => {
    test('returns ok:true with data on 201', async () => {
      const responseBody = { id: 'req-1', boardId: 'board-abc', status: 'pending' }

      nock(MURAL_MCP_URL)
        .post('/approvals/boards', { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' })
        .reply(201, responseBody)

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.data).toEqual(responseBody)
    })

    test('returns ok:false with status 409 on conflict', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .reply(409, { message: 'Board request already exists' })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(409)
      expect(result.data).toEqual({ message: 'Board request already exists' })
    })

    test('returns ok:false with status 500 on unexpected error', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .reply(500, { message: 'Internal server error' })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.data).toEqual({ message: 'Internal server error' })
    })

    test('throws on network error', async () => {
      nock(MURAL_MCP_URL)
        .post('/approvals/boards')
        .replyWithError('ECONNREFUSED')

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }

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
      expect(result.data).toEqual({ message: 'Not found' })
    })

    test('returns ok:false with status 500 on unexpected error', async () => {
      nock(MURAL_MCP_URL)
        .get('/approvals/boards/board-abc')
        .reply(500, { message: 'Internal server error' })

      const result = await getBoardRequest('board-abc')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.data).toEqual({ message: 'Internal server error' })
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
