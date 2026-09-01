import { connectionChecks } from '../../constants/connection-checks.js'
import { connectionFailureReasons } from '../../constants/connection-failure-reasons.js'
import { linkingOutcomes } from '../../constants/linking-outcomes.js'

const LINKING_MESSAGES = {
  [linkingOutcomes.SUCCESS]: { type: 'success', text: 'Connected successfully!' },
  [linkingOutcomes.VALIDATION_FAILED]: { type: 'error', text: 'Security validation failed - please try again' },
  [linkingOutcomes.FAILED]: { type: 'error', text: 'Connection failed - please try again' },
  [linkingOutcomes.CANCELLED]: { type: 'warning', text: 'Connection cancelled - you can try again later' }
}

const CHECK_FAILURE_DETAILS = {
  [connectionFailureReasons.UNAUTHORIZED]:
    'Your Mural connection has either expired or been revoked. Reconnect your account to fix it.',
  [connectionFailureReasons.MURAL_API_ERROR]:
    'Mural is not responding right now. This is likely a problem on Mural\'s side rather than with your connection - reconnecting probably will not help, but you can try if it keeps happening.'
}
const DEFAULT_CHECK_FAILURE_DETAIL = 'Mural MCP could not use your connection. Reconnect your account to fix it.'

const stepStatuses = {
  CONFIRMED: 'confirmed',
  LINKED: 'linked',
  WORKING: 'working',
  ISSUE: 'issue',
  NOT_CHECKED: 'not-checked'
}

class LinkingStatusViewModel {
  constructor (data = {}) {
    this.statusError = data.statusError ?? false
    this.linked = data.linked ?? false
    this.linkingUrl = data.linkingUrl ?? null
    this.message = data.message ?? null
    this.requiredReason = data.requiredReason ?? null
    this.steps = data.steps ?? []
    this.needsReconnect = data.needsReconnect ?? false
    this.reconnectUrl = data.reconnectUrl ?? null
  }

  /**
   * Build the view model from the service results and, optionally, the outcome
   * code of a just-completed OAuth callback and the reason a gated route sent
   * the user here.
   *
   * @param {{linkingStatus: object|null, statusError: boolean, authorizationUrl: string|null}} status
   * @param {object} [options]
   * @param {string} [options.outcome] - A `linkingOutcomes` code flashed by the callback controller
   * @param {string} [options.requiredReason] - What the user was trying to do when a gated route stopped them
   * @param {string} [options.userEmail] - Shown against the connection once linked
   * @param {{state: string, profile: object|null, reason: string|null}} [options.check] - Test-connection result
   * @param {string} [options.reconnectUrl] - Authorization URL, when a stored connection has been refused
   * @returns {LinkingStatusViewModel}
   */
  static fromLinkingStatus (status, options = {}) {
    const message = LINKING_MESSAGES[options.outcome] ?? null
    const linked = Boolean(!status.statusError && status.linkingStatus?.linked)

    return new LinkingStatusViewModel({
      statusError: status.statusError,
      linked,
      linkingUrl: status.statusError ? null : status.authorizationUrl,
      message,
      requiredReason: options.requiredReason ?? null,
      needsReconnect: linked && options.check?.state === connectionChecks.FAILED,
      reconnectUrl: options.reconnectUrl ?? null,
      steps: _steps({
        linked,
        statusError: status.statusError,
        check: options.check,
        userEmail: options.userEmail
      })
    })
  }
}

/**
 * @private
 * The state of the connection itself, and nothing else. An earlier version
 * added a "get a board approved" step, but a board approval is a governance
 * fact about a *board* - it is not part of connecting an account, and it does
 * not belong on a page about the user's Mural connection.
 *
 * Step 2 says a token is stored; step 3 says it works. They are genuinely
 * different: an expired or revoked token still reads as linked while every MCP
 * tool call fails, and only the test-connection check catches that.
 *
 * No step carries an `href`. The list is a status readout; the actions live in
 * the buttons beneath it, so the page offers each one once rather than twice
 * pointing at the same place.
 */
function _steps ({ linked, statusError, check, userEmail }) {
  return [
    {
      number: 1,
      title: 'Sign in to the portal',
      status: stepStatuses.CONFIRMED,
      statusText: 'Done',
      detail: userEmail ? `Signed in as ${userEmail}` : null
    },
    _connectionStep({ linked, statusError, userEmail }),
    _checkStep({ linked, statusError, check })
  ]
}

/**
 * @private
 * Whether Mural MCP can actually use the stored connection.
 */
function _checkStep ({ linked, statusError, check }) {
  const step = { number: 3, title: 'Check Mural MCP' }

  if (statusError || !linked) {
    return {
      ...step,
      status: stepStatuses.NOT_CHECKED,
      statusText: 'Not checked',
      detail: 'Runs once your Mural account is connected.'
    }
  }

  if (check?.state === connectionChecks.VERIFIED) {
    return {
      ...step,
      status: stepStatuses.WORKING,
      statusText: 'Working',
      detail: _verifiedDetail(check.profile)
    }
  }

  if (check?.state === connectionChecks.FAILED) {
    return {
      ...step,
      status: stepStatuses.ISSUE,
      statusText: 'Not working',
      detail: CHECK_FAILURE_DETAILS[check.reason] ?? DEFAULT_CHECK_FAILURE_DETAIL
    }
  }

  return {
    ...step,
    status: stepStatuses.NOT_CHECKED,
    statusText: 'Not checked',
    detail: 'We could not check this just now. Your connection may still be fine.'
  }
}

/**
 * @private
 */
function _verifiedDetail (profile) {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  const who = name || profile?.email

  return who
    ? `Mural MCP can reach Mural as ${who}.`
    : 'Mural MCP can reach Mural with your connection.'
}

/**
 * @private
 */
function _connectionStep ({ linked, statusError, userEmail }) {
  const title = 'Connect your Mural account'

  if (statusError) {
    return {
      number: 2,
      title,
      status: stepStatuses.ISSUE,
      statusText: 'Unavailable',
      detail: 'We could not check your connection. Try again in a few minutes.'
    }
  }

  if (linked) {
    return {
      number: 2,
      title,
      status: stepStatuses.LINKED,
      statusText: 'Connected',
      detail: userEmail ? `Your Mural account is connected as ${userEmail}` : null
    }
  }

  return {
    number: 2,
    title,
    status: stepStatuses.NOT_CHECKED,
    statusText: 'Not connected',
    detail: 'Gives the MCP server permission to read Mural boards as you.'
  }
}

export {
  LinkingStatusViewModel,
  stepStatuses
}
