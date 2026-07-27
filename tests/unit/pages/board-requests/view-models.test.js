import { ApprovalRequestViewModel } from '../../../../src/pages/board-requests/view-models.js'

describe('#ApprovalRequestViewModel', () => {
  const data = {
    id: 'req-1',
    boardId: 'board-abc',
    iao: 'Jane Smith',
    email: 'test@example.com',
    status: 'pending',
    submittedAt: '2024-01-01T00:00:00.000Z'
  }

  test('constructor maps all fields from the provided data', () => {
    const viewModel = new ApprovalRequestViewModel(data)

    expect(viewModel).toMatchObject(data)
  })

  test('fromResponse builds a view model from API response data', () => {
    const viewModel = ApprovalRequestViewModel.fromResponse(data)

    expect(viewModel).toBeInstanceOf(ApprovalRequestViewModel)
    expect(viewModel).toMatchObject(data)
  })
})
