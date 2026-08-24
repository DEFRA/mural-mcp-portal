import * as muralLinkRequiredController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/account/mural-linking/required',
    handler: muralLinkRequiredController.getMuralLinkRequiredPage
  }
]

export {
  routes
}
