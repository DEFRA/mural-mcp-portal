import { statusCodes } from '../../../constants/status-codes.js'
import { BoardRequestFormViewModel } from './view-models.js'

/**
 * GET /board-requests/new - by the time this runs, the `muralConnection`
 * server plugin has already redirected away any request that isn't Mural
 * linked (see `routes.js`'s `requiresMuralLink` option), so no guard is
 * needed here.
 */
async function getNewBoardRequest (_request, h) {
  const viewModel = BoardRequestFormViewModel.empty()

  return h.view('board-requests/new/new.njk', { ...viewModel })
    .code(statusCodes.HTTP_STATUS_OK)
}

async function postBoardRequestFailAction (request, h, err) {
  const viewModel = BoardRequestFormViewModel.fromValidationError(request.payload, err)
  return h.view('board-requests/new/new.njk', { ...viewModel })
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST).takeover()
}

/**
 * POST /board-requests/new - same Mural-linked guarantee as
 * `getNewBoardRequest`, enforced by the `muralConnection` server plugin.
 */
async function postBoardRequest (request, h) {
  const { boardId, iao } = request.payload
  const email = request.auth.credentials.profile.email || request.auth?.profile?.email

  const boardRequest = {
    boardId,
    iao,
    email,
    status: 'pending',
    submittedAt: new Date().toISOString()
  }

  request.yar.set('boardRequest', boardRequest)

  return h.redirect('/board-requests/new/confirmation').code(statusCodes.HTTP_STATUS_FOUND)
}

export {
  getNewBoardRequest,
  postBoardRequest,
  postBoardRequestFailAction
}
