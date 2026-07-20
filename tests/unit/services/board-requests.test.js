import { vi } from 'vitest'

import {
  submitBoardRequest,
  getBoardRequest
} from '../../../src/services/board-requests.js'

vi.mock('../../../src/infra/mural/approvals.js')

import * as approvalsApi from '../../../src/infra/mural/approvals.js'

describe('#boardRequestsService', () => {
  describe('submitBoardRequest', () => {
    test('returns response data on 201', async () => {
      const data = { id: 'req-1', status: 'pending' }
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: true, status: 201, data })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result).toEqual(data)
      expect(approvalsApi.submitBoardRequest).toHaveBeenCalledWith(approvalRequest)
    })

    test('throws ConflictError on 409', async () => {
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: false, status: 409, data: null })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }

      await expect(submitBoardRequest(approvalRequest))
        .rejects.toThrow('Board approval request already exists')
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Network error')
      approvalsApi.submitBoardRequest.mockRejectedValue(error)

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }

      await expect(submitBoardRequest(approvalRequest))
        .rejects.toThrow('Network error')
    })
  })

  describe('getBoardRequest', () => {
    test('returns data on 200', async () => {
      const data = { id: 'req-1', boardId: 'board-abc', status: 'pending' }
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: true, status: 200, data })

      const approvalRequest = { boardId: 'board-abc' }
      const result = await getBoardRequest(approvalRequest)

      expect(result).toEqual(data)
      expect(approvalsApi.getBoardRequest).toHaveBeenCalledWith(approvalRequest)
    })

    test('returns null on 404', async () => {
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: false, status: 404, data: null })

      const approvalRequest = { boardId: 'board-abc' }
      const result = await getBoardRequest(approvalRequest)

      expect(result).toBeNull()
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Service unavailable')
      error.statusCode = 503
      approvalsApi.getBoardRequest.mockRejectedValue(error)

      const approvalRequest = { boardId: 'board-abc' }

      await expect(getBoardRequest(approvalRequest)).rejects.toThrow('Service unavailable')
    })
  })
})
