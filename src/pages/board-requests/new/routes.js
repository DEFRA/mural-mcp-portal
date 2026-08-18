import * as boardRequestController from './controller.js'
import { boardRequestSchema } from './schemas.js'

const routes = [
  {
    method: 'GET',
    path: '/board-requests/new',
    handler: boardRequestController.getNewBoardRequest
  },
  {
    method: 'POST',
    path: '/board-requests/new',
    options: {
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
