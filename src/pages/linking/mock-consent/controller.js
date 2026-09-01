import { statusCodes } from '../../../constants/status-codes.js'

/**
 * Get the simulated Mural consent page controller
 *
 * Stands in for Mural's real OAuth consent screen when linking is being
 * simulated (see `src/infra/mural/linking.js`) - reached only because
 * `getAuthorizationUrl` pointed the user here instead of at a real Mural
 * URL. Approve/Deny both link straight to the real callback route.
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 *
 * @returns {import('@hapi/hapi').ResponseObject} The response object for the mock consent page
 */
async function getMockConsentPage (request, h) {
  return h.view('linking/mock-consent/page.njk').code(statusCodes.HTTP_STATUS_OK)
}

export {
  getMockConsentPage
}
