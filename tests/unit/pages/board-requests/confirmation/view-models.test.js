import * as viewModels from '../../../../../src/pages/board-requests/new/confirmation/view-models.js'

describe('#BoardRequestConfirmationViewModel', () => {
  const boardRequest = {
    boardId: 'board-abc',
    iao: 'jane.smith@defra.gov.uk',
    email: 'user@defra.gov.uk',
    status: 'pending',
    submittedAt: '2024-01-01T00:00:00.000Z'
  }

  test('should map all fields from the provided data via the constructor', () => {
    const viewModel = new viewModels.BoardRequestConfirmationViewModel(boardRequest)

    expect(viewModel.boardId).toBe('board-abc')
    expect(viewModel.iao).toBe('jane.smith@defra.gov.uk')
    expect(viewModel.email).toBe('user@defra.gov.uk')
    expect(viewModel.status).toBe('pending')
    expect(viewModel.submittedAt).toBe('2024-01-01T00:00:00.000Z')
  })

  test('should build a view model from session-stored board request via fromSession()', () => {
    const viewModel = viewModels.BoardRequestConfirmationViewModel.fromSession(boardRequest)

    expect(viewModel).toBeInstanceOf(viewModels.BoardRequestConfirmationViewModel)
    expect(viewModel.boardId).toBe('board-abc')
    expect(viewModel.iao).toBe('jane.smith@defra.gov.uk')
    expect(viewModel.email).toBe('user@defra.gov.uk')
    expect(viewModel.status).toBe('pending')
    expect(viewModel.submittedAt).toBe('2024-01-01T00:00:00.000Z')
  })
})
