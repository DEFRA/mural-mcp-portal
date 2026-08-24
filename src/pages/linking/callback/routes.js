import * as callbackController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/account/mural-linking/callback',
    handler: callbackController.handleMuralLinkingCallback
  }
]

export {
  routes
}
