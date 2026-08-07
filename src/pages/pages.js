import { loginRouter } from './login/router.js'
import { boardRequestsRouter } from './board-requests/router.js'
import { homeRouter } from './home/router.js'

const pageRouter = {
  plugin: {
    name: 'pageRouter',
    async register (server) {
      await server.register([
        loginRouter,
        homeRouter,
        boardRequestsRouter
      ])
    }
  }
}

export {
  pageRouter
}
