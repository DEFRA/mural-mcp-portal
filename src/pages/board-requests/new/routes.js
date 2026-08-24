import * as boardRequestController from './controller.js'
import { boardRequestSchema } from './schemas.js'

const routes = [
  {
    method: 'GET',
    path: '/board-requests/new',
    options: {
      app: { requiresMuralLink: true, muralLinkReason: 'request a new Mural board' }
    },
    handler: boardRequestController.getNewBoardRequest
  },
  {
    method: 'POST',
    path: '/board-requests/new',
    options: {
      app: { requiresMuralLink: true, muralLinkReason: 'request a new Mural board' },
      validate: {
        payload: boardRequestSchema,
        failAction: boardRequestController.postBoardRequestFailAction
      }
    },
    handler: boardRequestController.postBoardRequest
  }
]

export {
  routes
}
