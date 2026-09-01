import { vi } from 'vitest'

import { createdBoardRequest, accessRequest } from '../../fixtures/mural-mcp.js'

import {
  submitBoardRequest,
  getBoardRequest,
  listBoards,
  listApprovalsForIao,
  getApprovalForIao,
  decideApproval
} from '../../../src/services/board-requests.js'

vi.mock('../../../src/infra/mural/approvals.js')

import * as approvalsApi from '../../../src/infra/mural/approvals.js'

describe('boardRequestsService', () => {
  describe('submitBoardRequest', () => {
    test('returns success:true with the response data on 201', async () => {
      const data = createdBoardRequest()
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: true, status: 201, data })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', userId: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result).toEqual({ success: true, data })
      expect(approvalsApi.submitBoardRequest).toHaveBeenCalledWith(approvalRequest)
    })

    test('returns success:false with reason:conflict on 409', async () => {
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: false, status: 409, data: null })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', userId: 'test@example.com' }
      const result = await submitBoardRequest(approvalRequest)

      expect(result).toEqual({ success: false, reason: 'conflict' })
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.submitBoardRequest.mockResolvedValue({ ok: false, status: 500, data: null })

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', userId: 'test@example.com' }

      await expect(submitBoardRequest(approvalRequest))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Network error')
      error.name = 'MuralMcpError'
      error.statusCode = 500
      approvalsApi.submitBoardRequest.mockRejectedValue(error)

      const approvalRequest = { boardId: 'board-abc', iao: 'Jane Smith', userId: 'test@example.com' }

      await expect(submitBoardRequest(approvalRequest))
        .rejects.toThrow('Network error')
    })
  })

  describe('getBoardRequest', () => {
    test('returns data on 200', async () => {
      const data = { id: 'req-1', boardId: 'board-abc', status: 'pending' }
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: true, status: 200, data })

      const result = await getBoardRequest('board-abc', 'test@example.com')

      expect(result).toEqual(data)
      expect(approvalsApi.getBoardRequest).toHaveBeenCalledWith('board-abc', 'test@example.com')
    })

    test('returns null on 404', async () => {
      approvalsApi.getBoardRequest.mockResolvedValue({ ok: false, status: 404, data: null })

      const result = await getBoardRequest('board-abc')

      expect(result).toBeNull()
    })

    test('throws when the infra layer throws', async () => {
      const error = new Error('Service unavailable')
      error.name = 'MuralMcpError'
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

  describe.skip('listBoards', () => {
    const boards = [
      accessRequest({ id: 'req-1', boardId: 'flood-board', reason: 'Flood mapping', userId: 'me@defra.gov.uk', status: 'approved' }),
      accessRequest({ id: 'req-2', boardId: 'farming-board', userId: 'me@defra.gov.uk', status: 'pending' }),
      accessRequest({ id: 'req-3', boardId: 'waste-board', userId: 'someone@defra.gov.uk', status: 'rejected' })
    ]

    beforeEach(() => {
      approvalsApi.listAccessRequests.mockResolvedValue({ ok: true, status: 200, data: boards })
    })

    test('returns every board when no filters are given', async () => {
      const result = await listBoards('me@defra.gov.uk')

      expect(result.map((board) => board.boardId))
        .toEqual(['flood-board', 'farming-board', 'waste-board'])
    })

    test('keeps only boards the caller requested when requestedByMe is set', async () => {
      const result = await listBoards('me@defra.gov.uk', { requestedByMe: true })

      expect(result.map((board) => board.boardId)).toEqual(['flood-board', 'farming-board'])
    })

    test('keeps only boards in one of the requested statuses', async () => {
      const result = await listBoards('me@defra.gov.uk', { statuses: ['approved', 'rejected'] })

      expect(result.map((board) => board.boardId)).toEqual(['flood-board', 'waste-board'])
    })

    test('matches the search query against the board id', async () => {
      const result = await listBoards('me@defra.gov.uk', { q: 'FARM' })

      expect(result.map((board) => board.boardId)).toEqual(['farming-board'])
    })

    test('matches the search query against the board name when one is present', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [accessRequest({ boardId: 'opaque-id', name: 'Air quality roadmap' })]
      })

      const result = await listBoards('me@defra.gov.uk', { q: 'air quality' })

      expect(result).toHaveLength(1)
    })

    test('combines filters rather than treating them as alternatives', async () => {
      const result = await listBoards('me@defra.gov.uk', {
        requestedByMe: true,
        statuses: ['rejected']
      })

      expect(result).toEqual([])
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({ ok: false, status: 500, data: null })

      await expect(listBoards('me@defra.gov.uk'))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })
  })

  describe.skip('listApprovalsForIao', () => {
    test('keeps only pending requests that name the caller as IAO', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [
          accessRequest({ id: 'mine', iao: 'me@defra.gov.uk' }),
          accessRequest({ id: 'someone-elses', iao: 'other@defra.gov.uk' })
        ]
      })

      const result = await listApprovalsForIao('me@defra.gov.uk')

      expect(result.map((request) => request.id)).toEqual(['mine'])
    })

    test('matches the IAO email regardless of case', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [accessRequest({ id: 'mine', iao: 'Me@Defra.Gov.UK' })]
      })

      const result = await listApprovalsForIao('me@defra.gov.uk')

      expect(result.map((request) => request.id)).toEqual(['mine'])
    })

    test('drops requests that have already been decided', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [
          accessRequest({ id: 'decided', iao: 'me@defra.gov.uk', status: 'approved' }),
          accessRequest({ id: 'waiting', iao: 'me@defra.gov.uk', status: 'pending' })
        ]
      })

      const result = await listApprovalsForIao('me@defra.gov.uk')

      expect(result.map((request) => request.id)).toEqual(['waiting'])
    })

    test('returns the oldest request first, so the longest wait is dealt with first', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [
          accessRequest({ id: 'newer', iao: 'me@defra.gov.uk', createdAt: '2026-08-27T10:00:00.000Z' }),
          accessRequest({ id: 'older', iao: 'me@defra.gov.uk', createdAt: '2026-08-01T10:00:00.000Z' })
        ]
      })

      const result = await listApprovalsForIao('me@defra.gov.uk')

      expect(result.map((request) => request.id)).toEqual(['older', 'newer'])
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({ ok: false, status: 500, data: null })

      await expect(listApprovalsForIao('me@defra.gov.uk'))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })
  })

  describe.skip('getApprovalForIao', () => {
    test('returns the request when it is pending and addressed to the caller', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [accessRequest({ id: 'req-1', iao: 'me@defra.gov.uk' })]
      })

      const result = await getApprovalForIao('req-1', 'me@defra.gov.uk')

      expect(result).toMatchObject({ id: 'req-1' })
    })

    test('returns null for a request addressed to another Information Asset Owner', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [accessRequest({ id: 'req-1', iao: 'other@defra.gov.uk' })]
      })

      const result = await getApprovalForIao('req-1', 'me@defra.gov.uk')

      expect(result).toBeNull()
    })

    test('returns null for a request that has already been decided', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({
        ok: true,
        status: 200,
        data: [accessRequest({ id: 'req-1', iao: 'me@defra.gov.uk', status: 'approved' })]
      })

      const result = await getApprovalForIao('req-1', 'me@defra.gov.uk')

      expect(result).toBeNull()
    })

    test('returns null for an id the service has never seen', async () => {
      approvalsApi.listAccessRequests.mockResolvedValue({ ok: true, status: 200, data: [] })

      expect(await getApprovalForIao('req-nope', 'me@defra.gov.uk')).toBeNull()
    })
  })

  describe.skip('decideApproval', () => {
    test('returns the decided request on success', async () => {
      const data = accessRequest({ status: 'approved' })
      approvalsApi.decideAccessRequest.mockResolvedValue({ ok: true, status: 200, data })

      const result = await decideApproval('req-1', 'approve', { decisionReason: 'Yes' }, 'me@defra.gov.uk')

      expect(result).toEqual({ success: true, data })
      expect(approvalsApi.decideAccessRequest)
        .toHaveBeenCalledWith('req-1', 'approve', { decisionReason: 'Yes' }, 'me@defra.gov.uk')
    })

    test('reports a request decided elsewhere as gone', async () => {
      approvalsApi.decideAccessRequest.mockResolvedValue({ ok: false, status: 409, data: null })

      const result = await decideApproval('req-1', 'approve', {}, 'me@defra.gov.uk')

      expect(result).toEqual({ success: false, reason: 'gone' })
    })

    test('reports a withdrawn request as gone too, since neither is the reviewer\'s to decide', async () => {
      approvalsApi.decideAccessRequest.mockResolvedValue({ ok: false, status: 404, data: null })

      const result = await decideApproval('req-1', 'approve', {}, 'me@defra.gov.uk')

      expect(result).toEqual({ success: false, reason: 'gone' })
    })

    test('throws with statusCode on an unexpected status', async () => {
      approvalsApi.decideAccessRequest.mockResolvedValue({ ok: false, status: 500, data: null })

      await expect(decideApproval('req-1', 'approve', {}, 'me@defra.gov.uk'))
        .rejects.toMatchObject({ message: 'Unexpected status 500 from approvals API', statusCode: 500 })
    })
  })
})
