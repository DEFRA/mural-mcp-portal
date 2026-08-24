import * as linkingController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/account/mural-linking',
    handler: linkingController.getMuralLinkingPage
  }
]

export {
  routes
}
