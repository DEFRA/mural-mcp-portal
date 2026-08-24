import { muralClient } from './client.js'

/**
 * ApprovalRequest - Domain type for board request approvals
 * @typedef {Object} ApprovalRequest
 * @property {string} boardId - The ID of the board
 * @property {string} iao - The Integrated Assurance Officer
 * @property {string} email - The email of the requester
 * @property {string} [status] - The status of the approval
 * @property {string} [submittedAt] - When the request was submitted
 */

/**
 * ApprovalRequestPayload - API request body for submission
 * @typedef {Object} ApprovalRequestPayload
 * @property {string} boardId - The ID of the board
 * @property {string} iao - The Integrated Assurance Officer
 * @property {string} email - The email of the requester
 */

/**
 * Submit a board approval request
 * @param {ApprovalRequest} approvalRequest - The approval request
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function submitBoardRequest (approvalRequest) {
  const body = {
    boardId: approvalRequest.boardId,
    iao: approvalRequest.iao,
    email: approvalRequest.email
  }

  return muralClient.request('/approvals/boards', {
    method: 'POST',
    body,
    userId: approvalRequest.email
  })
}

/**
 * Get a board approval request
 * @param {string} boardId - The ID of the board
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function getBoardRequest (boardId) {
  return muralClient.request(`/approvals/boards/${encodeURIComponent(boardId)}`)
}

export {
  submitBoardRequest,
  getBoardRequest
}
