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

export {
  ApprovalRequestViewModel
}
