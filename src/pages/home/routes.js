import * as homeController from './controller.js'

const routes = [
  {
    method: 'GET',
    path: '/',
    handler: homeController.getHomepage
  }
]

export {
  routes
}
