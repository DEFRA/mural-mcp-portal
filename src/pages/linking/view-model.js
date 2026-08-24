import { linkingOutcomes } from '../../constants/linking-outcomes.js'

/**
 * Display text for each linking outcome code the OAuth callback may have
 * flashed into the session. Owned here, not by the callback controller,
 * since the view model is what decides how a code is actually presented.
 */
const LINKING_MESSAGES = {
  [linkingOutcomes.SUCCESS]: { type: 'success', text: 'Connected successfully!' },
  [linkingOutcomes.VALIDATION_FAILED]: { type: 'error', text: 'Security validation failed - please try again' },
  [linkingOutcomes.FAILED]: { type: 'error', text: 'Connection failed - please try again' },
  [linkingOutcomes.CANCELLED]: { type: 'warning', text: 'Connection cancelled - you can try again later' }
}

/**
 * LinkingStatusViewModel - Display model for the Mural account linking page
 */
class LinkingStatusViewModel {
  constructor (data = {}) {
    this.statusError = data.statusError ?? false
    this.linked = data.linked ?? false
    this.linkingUrl = data.linkingUrl ?? null
    this.message = data.message ?? null
  }

  /**
   * Build the view model from the service's linking status result and,
   * optionally, the outcome code of a just-completed OAuth callback.
   *
   * @param {{linkingStatus: object|null, statusError: boolean, authorizationUrl: string|null}} status
   * @param {string} [outcome] - A `linkingOutcomes` code flashed by the callback controller
   * @returns {LinkingStatusViewModel}
   */
  static fromLinkingStatus (status, outcome) {
    const message = LINKING_MESSAGES[outcome] ?? null

    if (status.statusError) {
      return new LinkingStatusViewModel({ statusError: true, message })
    }

    return new LinkingStatusViewModel({
      linked: status.linkingStatus.linked,
      linkingUrl: status.authorizationUrl,
      message
    })
  }
}

export {
  LinkingStatusViewModel
}
