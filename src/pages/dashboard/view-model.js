/**
 * The three states the Mural connection row can be in, as a ready-to-render
 * summary-list value.
 */
const CONNECTION_STATES = {
  error: {
    tagText: 'Unavailable',
    tagClasses: 'govuk-tag--grey',
    hint: 'We couldn\'t check your Mural connection status. Try again later.',
    actionText: null,
    actionHref: null
  },
  linked: {
    tagText: 'Connected',
    tagClasses: 'govuk-tag--green',
    hint: null,
    actionText: 'Manage your Mural connection',
    actionHref: '/account/mural-linking'
  },
  notLinked: {
    tagText: 'Not connected',
    tagClasses: 'govuk-tag--grey',
    hint: 'Connect your Mural account so the MCP server can read boards as you.',
    actionText: 'Connect your Mural account',
    actionHref: '/account/mural-linking'
  }
}

class DashboardViewModel {
  constructor (data = {}) {
    this.muralStatusError = data.muralStatusError ?? false
    this.muralLinked = data.muralLinked ?? false
    this.connection = data.connection ?? CONNECTION_STATES.notLinked
    this.reviewCount = data.reviewCount ?? 0
  }

  /**
   * Build the view model from the linking service's status result.
   *
   * @param {{linkingStatus: object|null, statusError: boolean, authorizationUrl: string|null}} status
   * @returns {DashboardViewModel}
   */
  static fromLinkingStatus (status) {
    if (status.statusError) {
      return new DashboardViewModel({
        muralStatusError: true,
        connection: CONNECTION_STATES.error
      })
    }

    const linked = status.linkingStatus.linked

    return new DashboardViewModel({
      muralLinked: linked,
      connection: linked ? CONNECTION_STATES.linked : CONNECTION_STATES.notLinked
    })
  }
}

export {
  DashboardViewModel
}
