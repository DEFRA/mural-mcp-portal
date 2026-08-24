import { statusCodes } from '../../constants/status-codes.js'
import { muralClient } from './client.js'

/**
 * Get an authorization URL for Mural linking
 * @param {string} userId - The user ID for which to get the authorization URL
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function getAuthorizationUrl (userId) {
  return muralClient.request('/linking/authorization-url', {
    method: 'GET',
    userId
  })
}

/**
 * Check linking status for a user
 *
 * @param {string} userId - The user ID for which to check linking status
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function checkLinkingStatus (userId) {
  return muralClient.request('/linking/status', {
    method: 'GET',
    userId
  })
}

/**
 * Complete the OAuth linking flow for a user
 *
 * @param {string} userId - The user ID completing the link
 * @param {object} params - OAuth callback parameters
 * @param {string} params.code - The authorization code from OAuth provider
 * @param {string} params.state - The state parameter for CSRF validation
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 * @throws {MuralApiError} - When response is not ok and not a 400 bad request
 */
async function completeLinking (userId, params) {
  const query = new URLSearchParams({ code: params.code, state: params.state })

  return muralClient.request(`/linking/callback?${query}`, {
    method: 'GET',
    userId,
    expected: [statusCodes.HTTP_STATUS_BAD_REQUEST]
  })
}

export {
  getAuthorizationUrl,
  checkLinkingStatus,
  completeLinking
}
