import { statusCodes } from '../../../../constants/status-codes.js'
import { BoardRequestConfirmationViewModel } from './view-models.js'

async function getConfirmation (request, h) {
  const boardRequest = request.yar.get('boardRequest', true)

  if (!boardRequest) {
    return h.redirect('/board-requests/new').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const viewModel = BoardRequestConfirmationViewModel.fromSession(boardRequest)

  return h.view('board-requests/new/confirmation/confirmation.njk', { boardRequest: { ...viewModel } })
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getConfirmation
}
