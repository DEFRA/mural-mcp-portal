import * as viewModels from '../../../../../src/pages/board-requests/new/view-models.js'

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
    const viewModel = new viewModels.ApprovalRequestViewModel(data)

    expect(viewModel).toMatchObject(data)
  })

  test('fromResponse builds a view model from API response data', () => {
    const viewModel = viewModels.ApprovalRequestViewModel.fromResponse(data)

    expect(viewModel).toBeInstanceOf(viewModels.ApprovalRequestViewModel)
    expect(viewModel).toMatchObject(data)
  })
})

describe('#BoardRequestFormViewModel', () => {
  test('constructor initializes with provided values', () => {
    const data = {
      boardId: 'board-123',
      iao: 'jane@defra.gov.uk',
      errors: { iao: { text: 'Invalid email' } },
      errorList: [{ text: 'Invalid email', href: '#iao' }]
    }

    const viewModel = new viewModels.BoardRequestFormViewModel(data)

    expect(viewModel.boardId).toBe('board-123')
    expect(viewModel.iao).toBe('jane@defra.gov.uk')
    expect(viewModel.errors).toEqual({ iao: { text: 'Invalid email' } })
    expect(viewModel.errorList).toEqual([{ text: 'Invalid email', href: '#iao' }])
  })

  test('empty() creates a blank form instance', () => {
    const viewModel = viewModels.BoardRequestFormViewModel.empty()

    expect(viewModel.boardId).toBe(null)
    expect(viewModel.iao).toBe(null)
    expect(viewModel.errors).toBe(null)
    expect(viewModel.errorList).toBe(null)
  })

  test('fromValidationError() extracts Joi errors into structured errors and errorList', () => {
    const payload = {
      boardId: 'board-123',
      iao: 'invalid-email'
    }

    const err = {
      details: [
        { path: ['boardId'], message: 'Enter a Board ID' },
        { path: ['iao'], message: 'Enter a valid email address' }
      ]
    }

    const viewModel = viewModels.BoardRequestFormViewModel.fromValidationError(payload, err)

    expect(viewModel.boardId).toBe('board-123')
    expect(viewModel.iao).toBe('invalid-email')
    expect(viewModel.errors).toEqual({
      boardId: { text: 'Enter a Board ID' },
      iao: { text: 'Enter a valid email address' }
    })
    expect(viewModel.errorList).toEqual([
      { text: 'Enter a Board ID', href: '#boardId' },
      { text: 'Enter a valid email address', href: '#iao' }
    ])
  })

  test('fromValidationError() preserves payload values even with validation errors', () => {
    const payload = {
      boardId: 'valid-board',
      iao: 'invalid-email'
    }

    const err = {
      details: [
        { path: ['iao'], message: 'Enter a valid email address' }
      ]
    }

    const viewModel = viewModels.BoardRequestFormViewModel.fromValidationError(payload, err)

    expect(viewModel.boardId).toBe('valid-board')
    expect(viewModel.iao).toBe('invalid-email')
  })
})
