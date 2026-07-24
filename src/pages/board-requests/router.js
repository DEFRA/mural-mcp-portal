import * as controller from './controller.js'
import { boardRequestSchema } from './schemas.js'

const routes = [
  {
    method: 'GET',
    path: '/board-requests/new',
    handler: controller.getNewBoardRequest
  },
  {
    method: 'POST',
    path: '/board-requests',
    options: {
      validate: {
        payload: boardRequestSchema,
        failAction: controller.postBoardRequestFailAction
      }
    },
    handler: controller.postBoardRequest
  },
  {
    method: 'GET',
    path: '/board-requests/confirmation',
    handler: controller.getConfirmation
  }
]

const boardRequestsRouter = {
  plugin: {
    name: 'boardRequestsRouter',
    register (server) {
      server.route(routes)
    }
  }
}

export {
  boardRequestsRouter
}
