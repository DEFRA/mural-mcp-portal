import { boardStatuses } from '../constants/board-statuses.js'
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
    return {
      success: true,
      data: res.data
    }
  }

  if (res.status === statusCodes.HTTP_STATUS_CONFLICT) {
    return {
      success: false,
      reason: 'conflict'
    }
  }

  throw _unexpectedStatus(res.status)
}

/**
 * Get the board approval request for a single board.
 *
 * @param {string} boardId - The ID of the board
 * @param {string} userId - The signed-in user
 * @returns {Promise<Object|null>} The approval request data, or null if the
 *   board has never been requested
 * @throws {MuralApiError} - If an unexpected error occurs
 */
async function getBoardRequest (boardId, userId) {
  // Only pass userId through when it is explicitly provided so the infra
  // layer doesn't receive an extra undefined argument (tests assert a
  // single-argument call in the common case).
  const res = (typeof userId === 'undefined')
    ? await approvalsApi.getBoardRequest(boardId)
    : await approvalsApi.getBoardRequest(boardId, userId)

  if (res.ok) {
    return res.data
  }

  if (res.status === statusCodes.HTTP_STATUS_NOT_FOUND) {
    return null
  }

  throw _unexpectedStatus(res.status)
}

/**
 * List governed boards, newest request first.
 *
 * A board *is* its access request here: approval is a service-wide fact about
 * the board rather than a per-user grant, so the set of boards the service
 * knows about is exactly the set that has been through - or is going through
 * - the request/review workflow.
 *
 * Filtering happens here rather than in the controller so the boards page and
 * any future caller share one definition of what a filter means.
 *
 * @param {string} userId - The signed-in user
 * @param {{q?: string, statuses?: string[], requestedByMe?: boolean}} [filters]
 * @returns {Promise<Object[]>} Matching boards
 * @throws {MuralApiError} - If an unexpected error occurs
 */
async function listBoards (userId, filters = {}) {
  const res = await approvalsApi.listAccessRequests(userId)

  if (!res.ok) {
    throw _unexpectedStatus(res.status)
  }

  const query = filters.q?.trim().toLowerCase()

  return (res.data ?? []).filter((board) => {
    if (filters.requestedByMe && board.userId !== userId) {
      return false
    }

    if (filters.statuses?.length && !filters.statuses.includes(board.status)) {
      return false
    }

    if (query && !_matchesQuery(board, query)) {
      return false
    }

    return true
  })
}

/**
 * List the pending requests awaiting the signed-in user's decision as
 * Information Asset Owner.
 *
 * The IAO filter is applied here because upstream
 * `GET /admin/access-requests` returns every pending request unfiltered -
 * there is no `iao` query parameter to push this down to.
 *
 * @param {string} userId - The signed-in user's email, matched against `iao`
 * @returns {Promise<Object[]>} Requests this user must review, oldest first
 * @throws {MuralApiError} - If an unexpected error occurs
 */
async function listApprovalsForIao (userId) {
  const res = await approvalsApi.listAccessRequests(userId, { status: boardStatuses.PENDING })

  if (!res.ok) {
    throw _unexpectedStatus(res.status)
  }

  return (res.data ?? [])
    .filter((request) => request.status === boardStatuses.PENDING)
    .filter((request) => _sameUser(request.iao, userId))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

/**
 * Fetch one pending request that the signed-in user is entitled to review.
 *
 * Reads the list and picks the request out of it, because upstream has no
 * `GET /admin/access-requests/{id}` - the list endpoint is the only way in.
 * The IAO check happens here rather than in the controller so that no caller
 * can reach a request addressed to somebody else by knowing its id.
 *
 * @param {string} requestId
 * @param {string} userId - The signed-in user's email, matched against `iao`
 * @returns {Promise<Object|null>} The request, or null if it is absent,
 *   already decided, or addressed to another Information Asset Owner
 * @throws {MuralApiError} - If an unexpected error occurs
 */
async function getApprovalForIao (requestId, userId) {
  const approvals = await listApprovalsForIao(userId)

  return approvals.find((request) => request.id === requestId) ?? null
}

/**
 * @private
 * Board id and name are both searchable - a user looking for a board is as
 * likely to paste an id out of a Mural URL as to type part of its name.
 */
function _matchesQuery (board, query) {
  return [board.boardId, board.name]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query))
}

/**
 * @private
 * Email addresses are case-insensitive, and an IAO recorded as
 * `First.Last@defra.gov.uk` must still match a session email of
 * `first.last@defra.gov.uk`.
 */
function _sameUser (a, b) {
  return Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase()
}

/**
 * @private
 */
function _unexpectedStatus (status) {
  const error = new Error(`Unexpected status ${status} from approvals API`)
  error.statusCode = status

  return error
}

export {
  submitBoardRequest,
  getBoardRequest,
  listBoards,
  listApprovalsForIao,
  getApprovalForIao
}
