import { statusCodes } from '../../constants/status-codes.js'
import { hasMuralConnection } from './helpers/mural-connection.js'

async function getNewBoardRequest (request, h) {
  if (!hasMuralConnection(request)) {
    return h.redirect('/').code(statusCodes.HTTP_STATUS_FOUND)
  }

  return h.view('board-requests/new.njk', { values: {}, errors: {} })
    .code(statusCodes.HTTP_STATUS_OK)
}

async function postBoardRequestFailAction (request, h, err) {
  const errors = {}
  const errorList = []

  for (const detail of err.details) {
    const field = detail.path[0]
    errors[field] = { text: detail.message }
    errorList.push({ text: detail.message, href: `#${field}` })
  }

  return h.view('board-requests/new.njk', {
    values: request.payload,
    errors,
    errorList
  }).code(statusCodes.HTTP_STATUS_BAD_REQUEST).takeover()
}

async function postBoardRequest (request, h) {
  if (!hasMuralConnection(request)) {
    return h.redirect('/').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const { boardId, iao } = request.payload

  const boardRequest = {
    boardId,
    iao,
    email: request.auth.credentials.email,
    token: request.auth.credentials.token,
    status: 'pending',
    submittedAt: new Date().toISOString()
  }

  request.yar.set('boardRequest', boardRequest)

  return h.redirect('/board-requests/confirmation').code(statusCodes.HTTP_STATUS_FOUND)
}

async function getConfirmation (request, h) {
  const boardRequest = request.yar.get('boardRequest', true)

  return h.view('board-requests/confirmation.njk', { boardRequest })
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getNewBoardRequest,
  postBoardRequest,
  postBoardRequestFailAction,
  getConfirmation
}
