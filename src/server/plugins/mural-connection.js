import { DEFAULT_MURAL_LINK_REASON, MURAL_LINK_REQUIRED_SESSION_KEY } from '../../constants/mural-link-required.js'
import { isMuralLinked } from '../../services/mural-linking.js'

/**
 * Guards routes that require a linked Mural account.
 *
 * Only runs for routes that opt in via `options.app.requiresMuralLink` -
 * most routes don't care about Mural linking, and this check costs an
 * outbound call to the Mural MCP API, so it isn't made unconditionally. A
 * gated route can also set `options.app.muralLinkReason` - a short phrase
 * describing what the user was trying to do (e.g. "request a new Mural
 * board") - for the gate page to explain why they landed there.
 *
 * A connected request is decorated with `request.app.muralConnected` (true)
 * and allowed through. A request that isn't connected - including one with
 * no authenticated user - has its path and reason stashed in the session,
 * and is redirected to the dedicated "connect Mural" gate page instead of
 * the general linking/status page, so the two don't end up showing
 * overlapping panels. The route handler never runs. Doing this here, once,
 * rather than in every gated controller, keeps it in one place as more
 * routes opt in.
 *
 * Registered as `onPreHandler`, which runs after authentication, so
 * `request.auth.credentials` is already populated where present.
 */
const muralConnection = {
  plugin: {
    name: 'muralConnection',
    register (server) {
      server.ext('onPreHandler', async (request, h) => {
        const { requiresMuralLink, muralLinkReason } = request.route.settings.app ?? {}

        if (!requiresMuralLink) {
          return h.continue
        }

        if (!request.auth.isAuthenticated) {
          return h.redirect('/').takeover()
        }

        const userId = request.auth.credentials.profile.email
        const connected = Boolean(userId) && await isMuralLinked(userId)

        request.app.muralConnected = connected

        if (connected) {
          return h.continue
        }

        request.yar.set(MURAL_LINK_REQUIRED_SESSION_KEY, {
          returnTo: request.path,
          reason: muralLinkReason ?? DEFAULT_MURAL_LINK_REASON
        })

        return h.redirect('/account/mural-linking/required').takeover()
      })
    }
  }
}

export {
  muralConnection
}
