import * as mockConsentController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/account/mural-linking/mock-consent',
    handler: mockConsentController.getMockConsentPage
  }
]

export {
  routes
}
