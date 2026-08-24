import { statusCodes } from '../../constants/status-codes.js'
import { muralClient } from './client.js'

/**
 * ApprovalRequest - Domain type for board request approvals
 * @typedef {Object} ApprovalRequest
 * @property {string} boardId - The ID of the board
 * @property {string} iao - The Integrated Assurance Officer
 * @property {string} email - The email of the requester
 * @property {string} reason - The reason for the request
 */

/**
 * Submit a board approval request
 * @param {ApprovalRequest} approvalRequest - The approval request
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 * @throws {MuralApiError} - When response is not ok and not a 409 conflict
 */
async function submitBoardRequest (approvalRequest) {
  const body = {
    boardId: approvalRequest.boardId,
    iao: approvalRequest.iao,
    reason: approvalRequest.reason
  }

  return muralClient.request('/approvals/boards', {
    method: 'POST',
    body,
    userId: approvalRequest.email,
    expected: [statusCodes.HTTP_STATUS_CONFLICT]
  })
}

/**
 * Get a board approval request
 * @param {string} boardId - The ID of the board
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 * @throws {MuralApiError} - When response is not ok and not a 404 not found
 */
async function getBoardRequest (boardId) {
  return muralClient.request(`/approvals/boards/${encodeURIComponent(boardId)}`, {
    expected: [statusCodes.HTTP_STATUS_NOT_FOUND]
  })
}

export {
  submitBoardRequest,
  getBoardRequest
}
