import { statusCodes } from '../../../constants/status-codes.js'
import { hasMuralConnection } from './helpers/mural-connection.js'
import { BoardRequestFormViewModel } from './view-models.js'

async function getNewBoardRequest (request, h) {
  if (!hasMuralConnection(request)) {
    return h.redirect('/').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const viewModel = BoardRequestFormViewModel.empty()
  return h.view('board-requests/new/new.njk', { ...viewModel })
    .code(statusCodes.HTTP_STATUS_OK)
}

async function postBoardRequestFailAction (request, h, err) {
  const viewModel = BoardRequestFormViewModel.fromValidationError(request.payload, err)
  return h.view('board-requests/new/new.njk', { ...viewModel })
    .code(statusCodes.HTTP_STATUS_BAD_REQUEST).takeover()
}

async function postBoardRequest (request, h) {
  if (!hasMuralConnection(request)) {
    return h.redirect('/').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const { boardId, iao } = request.payload
  const email = request.auth?.credentials?.profile?.email || request.auth?.profile?.email

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
