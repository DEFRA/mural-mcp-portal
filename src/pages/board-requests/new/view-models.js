/**
 * ApprovalRequestViewModel - Display model for board request approvals
 * Used to present approval request data in views and responses
 */
class ApprovalRequestViewModel {
  constructor (data) {
    this.id = data.id
    this.boardId = data.boardId
    this.iao = data.iao
    this.email = data.email
    this.status = data.status
    this.submittedAt = data.submittedAt
  }

  static fromResponse (responseData) {
    return new ApprovalRequestViewModel({
      id: responseData.id,
      boardId: responseData.boardId,
      iao: responseData.iao,
      email: responseData.email,
      status: responseData.status,
      submittedAt: responseData.submittedAt
    })
  }
}

/**
 * BoardRequestFormViewModel - Encapsulates form state for the board request form
 * Handles both initial state and validation error states
 */
class BoardRequestFormViewModel {
  constructor (data) {
    this.boardId = data?.boardId || null
    this.iao = data?.iao || null
    this.reason = data?.reason || null
    this.errors = data?.errors || null
    this.errorList = data?.errorList || null
  }

  /**
   * Create a form view model for the initial GET, optionally prefilled with a
   * board id carried over from the board page's "Request access" link.
   *
   * @param {string} [boardId]
   */
  static empty (boardId) {
    return new BoardRequestFormViewModel({ boardId })
  }

  /**
   * Create a form view model from a validation error
   * Extracts Joi error details into structured errors and errorList
   */
  static fromValidationError (payload, err) {
    const errors = {}
    const errorList = []

    for (const detail of err.details) {
      const field = detail.path[0]
      errors[field] = { text: detail.message }
      errorList.push({ text: detail.message, href: `#${field}` })
    }

    return new BoardRequestFormViewModel({
      boardId: payload.boardId,
      iao: payload.iao,
      reason: payload.reason,
      errors,
      errorList
    })
  }
}

export {
  ApprovalRequestViewModel,
  BoardRequestFormViewModel
}
