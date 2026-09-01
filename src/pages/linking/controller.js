import { LINKING_OUTCOME_SESSION_KEY } from '../../constants/linking-outcomes.js'
import { MURAL_LINK_REQUIRED_SESSION_KEY } from '../../constants/mural-link-required.js'
import { statusCodes } from '../../constants/status-codes.js'
import { connectionChecks } from '../../constants/connection-checks.js'
import {
  getLinkingStatus,
  verifyConnection,
  getAuthorizationUrl
} from '../../services/mural-linking.js'
import { LinkingStatusViewModel } from './view-model.js'

/**
 * GET /account/mural-linking - the user's Mural connection.
 *
 * Also the destination the `muralConnection` plugin redirects a gated request
 * to. There is no separate gate page: this one already owns connection status,
 * the authorization URL and the explanation, so a page whose only unique
 * content was one sentence of "you need to connect first" was an extra hop for
 * nothing. The sentence is shown here as a notification banner instead - the
 * user's action was interrupted, which is an event rather than a standing
 * fact.
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 *
 * @returns {import('@hapi/hapi').ResponseObject} The response object for the linking page
 */
async function getMuralLinkingPage (request, h) {
  const userId = request.auth.credentials.profile.email

  const outcome = request.yar.flash(LINKING_OUTCOME_SESSION_KEY)[0]
  const required = request.yar.get(MURAL_LINK_REQUIRED_SESSION_KEY)

  const status = await getLinkingStatus(userId)
  const linked = Boolean(!status.statusError && status.linkingStatus?.linked)

  // Connected since being stopped - in another tab, or by hitting back after
  // linking - so send them on to what they were originally after rather than
  // asking them to connect something they have already connected.
  if (required && linked) {
    request.yar.clear(MURAL_LINK_REQUIRED_SESSION_KEY)

    return h.redirect(required.returnTo).code(statusCodes.HTTP_STATUS_FOUND)
  }

  // Only worth asking Mural to prove a connection that exists - and only then
  // is a reconnect URL worth fetching, which `getLinkingStatus` skips once the
  // user is linked.
  const check = linked ? await verifyConnection(userId) : null

  const reconnectUrl = check?.state === connectionChecks.FAILED
    ? await getAuthorizationUrl(userId)
    : null

  const viewModel = LinkingStatusViewModel.fromLinkingStatus(status, {
    outcome,
    requiredReason: required?.reason ?? null,
    userEmail: userId,
    check,
    reconnectUrl
  })

  return h.view('linking/page.njk', viewModel).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getMuralLinkingPage
}
