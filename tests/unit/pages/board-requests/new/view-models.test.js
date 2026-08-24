import * as viewModels from '../../../../../pages/board-requests/new/view-models.js'

describe('ApprovalRequestViewModel', () => {
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

describe('BoardRequestFormViewModel', () => {
  test('constructor initializes with provided values', () => {
    const data = {
      boardId: 'board-123',
      iao: 'jane@defra.gov.uk',
      reason: 'Need this board for a workshop',
      errors: { iao: { text: 'Invalid email' } },
      errorList: [{ text: 'Invalid email', href: '#iao' }]
    }

    const viewModel = new viewModels.BoardRequestFormViewModel(data)

    expect(viewModel.boardId).toBe('board-123')
    expect(viewModel.iao).toBe('jane@defra.gov.uk')
    expect(viewModel.reason).toBe('Need this board for a workshop')
    expect(viewModel.errors).toEqual({ iao: { text: 'Invalid email' } })
    expect(viewModel.errorList).toEqual([{ text: 'Invalid email', href: '#iao' }])
  })

  test('constructor defaults reason to null when not provided', () => {
    const viewModel = new viewModels.BoardRequestFormViewModel({ boardId: 'board-123', iao: 'jane@defra.gov.uk' })

    expect(viewModel.reason).toBeNull()
  })

  test('empty() creates a blank form instance', () => {
    const viewModel = viewModels.BoardRequestFormViewModel.empty()

    expect(viewModel.boardId).toBe(null)
    expect(viewModel.iao).toBe(null)
    expect(viewModel.reason).toBe(null)
    expect(viewModel.errors).toBe(null)
    expect(viewModel.errorList).toBe(null)
  })

  test('fromValidationError() extracts Joi errors into structured errors and errorList', () => {
    const payload = {
      boardId: 'board-123',
      iao: 'invalid-email',
      reason: 'short'
    }

    const err = {
      details: [
        { path: ['boardId'], message: 'Enter a Board ID' },
        { path: ['iao'], message: 'Enter a valid email address' },
        { path: ['reason'], message: 'Reason must be at least 10 characters' }
      ]
    }

    const viewModel = viewModels.BoardRequestFormViewModel.fromValidationError(payload, err)

    expect(viewModel.boardId).toBe('board-123')
    expect(viewModel.iao).toBe('invalid-email')
    expect(viewModel.reason).toBe('short')
    expect(viewModel.errors).toEqual({
      boardId: { text: 'Enter a Board ID' },
      iao: { text: 'Enter a valid email address' },
      reason: { text: 'Reason must be at least 10 characters' }
    })
    expect(viewModel.errorList).toEqual([
      { text: 'Enter a Board ID', href: '#boardId' },
      { text: 'Enter a valid email address', href: '#iao' },
      { text: 'Reason must be at least 10 characters', href: '#reason' }
    ])
  })

  test('fromValidationError() preserves payload values even with validation errors', () => {
    const payload = {
      boardId: 'valid-board',
      iao: 'invalid-email',
      reason: 'Need this board for a workshop'
    }

    const err = {
      details: [
        { path: ['iao'], message: 'Enter a valid email address' }
      ]
    }

    const viewModel = viewModels.BoardRequestFormViewModel.fromValidationError(payload, err)

    expect(viewModel.boardId).toBe('valid-board')
    expect(viewModel.iao).toBe('invalid-email')
    expect(viewModel.reason).toBe('Need this board for a workshop')
  })
})
