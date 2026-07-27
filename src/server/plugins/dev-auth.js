const devAuth = {
  plugin: {
    name: 'devAuth',
    register (server) {
      server.auth.scheme('dev-auth', () => ({
        authenticate (_request, h) {
          return h.authenticated({ credentials: { email: 'test@example.com' } })
        }
      }))

      server.auth.strategy('dev', 'dev-auth')
      server.auth.default('dev')

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
  devAuth
}
