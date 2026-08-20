import { MURAL_LINK_REQUIRED_SESSION_KEY } from '../../../constants/mural-link-required.js'
import { statusCodes } from '../../../constants/status-codes.js'
import { isMuralLinked } from '../../../services/mural-linking.js'

/**
 * Get the "connect Mural" gate page controller
 *
 * Reached only via the `muralConnection` server plugin redirecting a
 * request away from a Mural-gated route - there's nothing useful to show
 * here without that context, so a direct hit with none stashed just sends
 * the user to the general linking/status page instead.
 *
 * Deliberately thin: it just explains why the user landed here and links
 * to `/account/mural-linking` to actually connect - that page owns the
 * connected/not-connected status, the authorization URL and the fuller
 * explanation of what connecting involves, so none of that is duplicated
 * here.
 *
 * Re-checks connection status on every load (rather than trusting the
 * plugin's redirect) so a user who's since connected - in another tab, or
 * by hitting back after linking - is sent straight back to where they were
 * headed rather than being told to connect again.
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 *
 * @returns {import('@hapi/hapi').ResponseObject} The response object for the gate page
 */
async function getMuralLinkRequiredPage (request, h) {
  const required = request.yar.get(MURAL_LINK_REQUIRED_SESSION_KEY)

  if (!required) {
    return h.redirect('/account/mural-linking').code(statusCodes.HTTP_STATUS_FOUND)
  }

  const userId = request.auth.credentials.profile.email
  const connected = await isMuralLinked(userId)

  if (connected) {
    request.yar.clear(MURAL_LINK_REQUIRED_SESSION_KEY)
    return h.redirect(required.returnTo).code(statusCodes.HTTP_STATUS_FOUND)
  }

  return h.view('linking/required/page.njk', { reason: required.reason })
    .code(statusCodes.HTTP_STATUS_OK)
}

export {
  getMuralLinkRequiredPage
}
