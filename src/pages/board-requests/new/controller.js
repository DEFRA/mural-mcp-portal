import { statusCodes } from '../../../constants/status-codes.js'
import { BoardRequestFormViewModel } from './view-models.js'
import { submitBoardRequest } from '../../../services/board-requests.js'

const NEW_BOARD_REQUEST_VIEW = 'board-requests/new/new.njk'

/**
 * GET /board-requests/new - by the time this runs, the `muralConnection`
 * server plugin has already redirected away any request that isn't Mural
 * linked (see `routes.js`'s `requiresMuralLink` option), so no guard is
 * needed here.
 */
async function getNewBoardRequest (_request, h) {
  const viewModel = BoardRequestFormViewModel.empty()

  return h.view(NEW_BOARD_REQUEST_VIEW, { ...viewModel })
    .code(statusCodes.HTTP_STATUS_OK)
}

async function postBoardRequestFailAction (request, h, err) {
  const viewModel = BoardRequestFormViewModel.fromValidationError(request.payload, err)

  return h.view(NEW_BOARD_REQUEST_VIEW, { ...viewModel })
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST).takeover()
}

/**
 * POST /board-requests/new - same Mural-linked guarantee as
 * `getNewBoardRequest`, enforced by the `muralConnection` server plugin.
 */
async function postBoardRequest (request, h) {
  const { boardId, iao, reason } = request.payload
  const userId = request.auth.credentials.profile.email

  const boardRequest = {
    boardId,
    iao,
    reason,
    userId
  }

  const result = await submitBoardRequest(boardRequest)

  if (result.success) {
    request.yar.set('boardRequest', {
      boardId,
      iao,
      email: userId,
      status: 'pending',
      submittedAt: new Date().toISOString()
    })

    return h.redirect('/board-requests/new/confirmation').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const viewModel = new BoardRequestFormViewModel({
    boardId,
    iao,
    reason,
    errors: {
      boardId: { text: 'A request for this board already exists' },
    },
    errorList: [
      { text: 'A request for this board already exists', href: '#boardId' }
    ]
  })

  return h.view(NEW_BOARD_REQUEST_VIEW, viewModel)
    .code(statusCodes.HTTP_STATUS_CONFLICT)
}

export {
  getNewBoardRequest,
  postBoardRequest,
  postBoardRequestFailAction
}
