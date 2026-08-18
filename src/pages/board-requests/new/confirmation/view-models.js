/**
 * BoardRequestConfirmationViewModel - Display model for board request confirmation
 * Wraps session-stored board request data for rendering the confirmation page
 */
class BoardRequestConfirmationViewModel {
  constructor ({ boardId, iao, email, status, submittedAt }) {
    this.boardId = boardId
    this.iao = iao
    this.email = email
    this.status = status
    this.submittedAt = submittedAt
  }

  /**
   * Create a view model from session-stored board request
   */
  static fromSession (boardRequest) {
    return new BoardRequestConfirmationViewModel({
      boardId: boardRequest.boardId,
      iao: boardRequest.iao,
      email: boardRequest.email,
      status: boardRequest.status,
      submittedAt: boardRequest.submittedAt
    })
  }
}

export {
  BoardRequestConfirmationViewModel
}
