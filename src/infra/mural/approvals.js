import { statusCodes } from '../../constants/status-codes.js'

import { config } from '../../config/config.js'

const baseUrl = config.get('muralMcp.url')

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

async function request (path, { method = 'GET', body, expected = [] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  if (response.ok) {
    const data = await response.json()
    return { ok: true, status: response.status, data }
  }

  if (expected.includes(response.status)) {
    return { ok: false, status: response.status, data: null }
  }

  const error = new Error(
    `Mural MCP API ${method} ${path} failed: ${response.status} ${response.statusText}`
  )

  error.statusCode = response.status
  throw error
}

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

  return request('/approvals/boards', {
    method: 'POST',
    body,
    expected: [statusCodes.HTTP_STATUS_CONFLICT]
  })
}

/**
 * Get a board approval request
 * @param {ApprovalRequest} approvalRequest - The approval request (only boardId is used)
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function getBoardRequest (approvalRequest) {
  return request(`/approvals/boards/${encodeURIComponent(approvalRequest.boardId)}`, {
    expected: [statusCodes.HTTP_STATUS_NOT_FOUND]
  })
}

export {
  submitBoardRequest,
  getBoardRequest
}
