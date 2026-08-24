import { constants as http2StatusCodes } from 'node:http2'

import * as approvalsApi from '../infra/mural/approvals.js'

/**
 * Submit a board approval request
 * @param {Object} approvalRequest - The approval request
 * @returns {Promise<Object>} The approval request response data
 * @throws {Error} If submission fails (conflict or unexpected error)
 */
async function submitBoardRequest (approvalRequest) {
  const res = await approvalsApi.submitBoardRequest(approvalRequest)

  if (res.ok) {
    return res.data
  }

  if (res.status === http2StatusCodes.HTTP_STATUS_CONFLICT) {
    const conflictError = new Error('Board approval request already exists')
    conflictError.statusCode = res.status
    throw conflictError
  }

  // Unexpected — will surface as 500 via catch-all
  const unexpectedError = new Error(`Unexpected status ${res.status} from approvals API`)
  unexpectedError.statusCode = res.status
  throw unexpectedError
}

/**
 * Get a board approval request
 * @param {Object} boardId - The ID of the board for which to retrieve the approval request
 * @returns {Promise<Object|null>} The approval request data, or null if not found
 * @throws {Error} If an unexpected error occurs
 */
async function getBoardRequest (boardId) {
  const res = await approvalsApi.getBoardRequest(boardId)

  if (res.ok) {
    return res.data
  }

  if (res.status === http2StatusCodes.HTTP_STATUS_NOT_FOUND) {
    return null
  }

  // Unexpected — will surface as 500 via catch-all
  const error = new Error(`Unexpected status ${res.status} from approvals API`)
  error.statusCode = res.status
  throw error
}

export {
  submitBoardRequest,
  getBoardRequest
}
