import { LINKING_OUTCOME_SESSION_KEY } from '../../constants/linking-outcomes.js'
import { statusCodes } from '../../constants/status-codes.js'
import { getLinkingStatus } from '../../services/mural-linking.js'
import { LinkingStatusViewModel } from './view-model.js'

/**
 * Get Mural linking page controller
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 *
 * @returns {import('@hapi/hapi').ResponseObject} The response object for the linking page
 */
async function getMuralLinkingPage (request, h) {
  const userId = request.auth.credentials.profile.email

  const outcome = request.yar.flash(LINKING_OUTCOME_SESSION_KEY)[0]
  const result = await getLinkingStatus(userId)
  const viewModel = LinkingStatusViewModel.fromLinkingStatus(result, outcome)

  return h.view('linking/page.njk', viewModel).code(statusCodes.HTTP_STATUS_OK)
}

export {
  getMuralLinkingPage
}
