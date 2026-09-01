/**
 * DashboardViewModel - Display model for the Mural connection status card
 * shown on the dashboard.
 *
 * Deliberately simpler than `linking/view-model.js`'s LinkingStatusViewModel
 * - the dashboard only needs to distinguish three states (error / linked /
 * not linked) to point the user at `/account/mural-linking`, not the fuller
 * outcome-message or authorization-URL handling that page owns.
 */
class DashboardViewModel {
  constructor (data = {}) {
    this.muralStatusError = data.muralStatusError ?? false
    this.muralLinked = data.muralLinked ?? false
  }

  /**
   * Build the view model from the linking service's status result.
   *
   * @param {{linkingStatus: object|null, statusError: boolean, authorizationUrl: string|null}} status
   * @returns {DashboardViewModel}
   */
  static fromLinkingStatus (status) {
    if (status.statusError) {
      return new DashboardViewModel({ muralStatusError: true })
    }

    return new DashboardViewModel({ muralLinked: status.linkingStatus.linked })
  }
}

export {
  DashboardViewModel
}
