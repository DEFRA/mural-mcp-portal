import { linkingOutcomes, LINKING_OUTCOME_SESSION_KEY } from '../../../constants/linking-outcomes.js'
import { MURAL_LINK_REQUIRED_SESSION_KEY } from '../../../constants/mural-link-required.js'
import { completeLinking } from '../../../services/mural-linking.js'

/**
 * Handle Mural OAuth callback
 *
 * On success, if this linking flow was started from the "connect Mural"
 * gate page (see `pages/linking/required`), sends the user straight back
 * to whatever they originally tried to reach instead of the general
 * linking/status page - no message needed, they'll just see the page they
 * asked for. Otherwise flashes the outcome code into the session - the
 * linking page controller owns turning that code into a displayable
 * message.
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 *
 * @returns {import('@hapi/hapi').ResponseObject} The response object
 */
async function handleMuralLinkingCallback (request, h) {
  const userId = request.auth.credentials.profile.email
  const { code, error, state } = request.query

  if (error || !code) {
    request.yar.flash(LINKING_OUTCOME_SESSION_KEY, linkingOutcomes.CANCELLED)
    return h.redirect('/account/mural-linking')
  }

  const result = await completeLinking(userId, { code, state })

  if (result.outcome === linkingOutcomes.SUCCESS) {
    const required = request.yar.get(MURAL_LINK_REQUIRED_SESSION_KEY)

    if (required) {
      request.yar.clear(MURAL_LINK_REQUIRED_SESSION_KEY)
      return h.redirect(required.returnTo)
    }
  }

  request.yar.flash(LINKING_OUTCOME_SESSION_KEY, result.outcome)

  return h.redirect('/account/mural-linking')
}

export {
  handleMuralLinkingCallback
}
