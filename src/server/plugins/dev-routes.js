/**
 * Routes that only make sense under the 'local' auth provider (see
 * `pages/login/controller.js`) - local dev and integration tests use these
 * to reach states a real Entra sign-in would otherwise be needed for,
 * without performing any OAuth round-trip.
 */
const devRoutes = {
  plugin: {
    name: 'devRoutes',
    register (server) {
      // Seed a Mural connection into the session — useful in tests and local dev
      server.route({
        method: 'GET',
        path: '/dev/mural-connect',
        options: { auth: false },
        handler (request, h) {
          request.yar.set('muralConnected', true)
          return h.response({ muralConnected: true })
        }
      })
    }
  }
}

export {
  devRoutes
}
