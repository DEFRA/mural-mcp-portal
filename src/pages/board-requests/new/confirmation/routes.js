import * as confirmationController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/board-requests/new/confirmation',
    handler: confirmationController.getConfirmation
  }
]

export {
  routes
}
