import { vi } from 'vitest'

import { createdBoardRequest } from '../../fixtures/mural-mcp.js'

import {
  submitBoardRequest,
  getBoardRequest
} from '../../../services/board-requests.js'

vi.mock('../../../infra/mural/approvals.js')

import * as approvalsApi from '../../../infra/mural/approvals.js'

describe('boardRequestsService', () => {
  describe('submitBoardRequest', () => {
    test('returns success:true with the response data on 201', async () => {
      const data = createdBoardRequest()
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: true, status: 201, data })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result).toEqual({ success: true, data })
      expect(approvalsApi.submitBoardRequest).toHaveBeenCalledWith(approvalRequest)
    })

    test('returns success:false with reason:conflict on 409', async () => {
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: false, status: 409, data: null })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result).toEqual({ success: false, reason: 'conflict' })
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: false, status: 500, data: null })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', email: 'test@example.com' }

      await expect(submitBoardRequest(approvalRequest))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Network error')
      error.name = 'MuralApiError'
      error.statusCode = 500
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

      const result = await getBoardRequest('board-abc')

      expect(result).toEqual(data)
      expect(approvalsApi.getBoardRequest).toHaveBeenCalledWith('board-abc')
    })

    test('returns null on 404', async () => {
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: false, status: 404, data: null })

      const result = await getBoardRequest('board-abc')

      expect(result).toBeNull()
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Service unavailable')
      error.name = 'MuralApiError'
      error.statusCode = 503
      approvalsApi.getBoardRequest.mockRejectedValue(error)

      await expect(getBoardRequest('board-abc')).rejects.toThrow('Service unavailable')
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: false, status: 500, data: null })

      await expect(getBoardRequest('board-abc'))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })
  })
})
