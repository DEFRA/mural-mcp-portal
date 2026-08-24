import { statusCodes } from '../constants/status-codes.js'

import * as approvalsApi from '../infra/mural/approvals.js'

/**
 * Submit a board approval request
 * @param {Object} approvalRequest - The approval request
 * @returns {Promise<Object>} The approval request response data or {success:false, reason:'conflict'} for 409
 * @throws {MuralApiError} - If submission fails with unexpected status
 */
async function submitBoardRequest (approvalRequest) {
  const res = await approvalsApi.submitBoardRequest(approvalRequest)

  if (res.ok) {
    return res.data
  }

  if (res.status === statusCodes.HTTP_STATUS_CONFLICT) {
    return {
      success: false,
      reason: 'conflict'
    }
  }

  const error = new Error(`Unexpected status ${res.status} from approvals API`)
  error.statusCode = res.status
  throw error
}

/**
 * Get a board approval request
 * @param {Object} boardId - The ID of the board for which to retrieve the approval request
 * @returns {Promise<Object|null>} The approval request data, or null if not found
 * @throws {MuralApiError} - If an unexpected error occurs
 */
async function getBoardRequest (boardId) {
  const res = await approvalsApi.getBoardRequest(boardId)

  if (res.ok) {
    return res.data
  }

  if (res.status === statusCodes.HTTP_STATUS_NOT_FOUND) {
    return null
  }

  const error = new Error(`Unexpected status ${res.status} from approvals API`)
  error.statusCode = res.status
  throw error
}

export {
  submitBoardRequest,
  getBoardRequest
}
