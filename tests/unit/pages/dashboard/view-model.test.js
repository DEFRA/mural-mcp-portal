import { DashboardViewModel } from '../../../../src/pages/dashboard/view-model.js'

describe('DashboardViewModel', () => {
  describe('constructor', () => {
    test('defaults every field when constructed with no data', () => {
      const viewModel = new DashboardViewModel()

      expect(viewModel).toMatchObject({
        muralStatusError: false,
        muralLinked: false
      })
    })
  })

  describe('fromLinkingStatus', () => {
    test('reflects a linked status when there is no status error', () => {
      const status = { statusError: false, linkingStatus: { linked: true }, authorizationUrl: null }

      const viewModel = DashboardViewModel.fromLinkingStatus(status)

      expect(viewModel).toMatchObject({
        muralStatusError: false,
        muralLinked: true
      })
    })

    test('reflects an unlinked status', () => {
      const status = { statusError: false, linkingStatus: { linked: false }, authorizationUrl: 'https://mural.example/authorize' }

      const viewModel = DashboardViewModel.fromLinkingStatus(status)

      expect(viewModel.muralLinked).toBe(false)
    })

    test('short-circuits to a status error without reading linkingStatus', () => {
      const status = { statusError: true, linkingStatus: null, authorizationUrl: null }

      const viewModel = DashboardViewModel.fromLinkingStatus(status)

      expect(viewModel).toMatchObject({
        muralStatusError: true,
        muralLinked: false
      })
    })
  })
})
