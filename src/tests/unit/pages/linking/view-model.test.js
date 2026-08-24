import { linkingOutcomes } from '../../../../constants/linking-outcomes.js'
import { LinkingStatusViewModel } from '../../../../pages/linking/view-model.js'

describe('LinkingStatusViewModel', () => {
  describe('constructor', () => {
    test('defaults every field when constructed with no data', () => {
      const viewModel = new LinkingStatusViewModel()

      expect(viewModel).toMatchObject({
        statusError: false,
        linked: false,
        linkingUrl: null,
        message: null
      })
    })
  })

  describe('fromLinkingStatus', () => {
    const connectedStatus = { statusError: false, linkingStatus: { linked: true }, authorizationUrl: 'https://mural.example/authorize' }

    test('reports the connected message for a successful callback outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, linkingOutcomes.SUCCESS)

      expect(viewModel.message).toEqual({ type: 'success', text: 'Connected successfully!' })
    })

    test('reports the validation-failed message for a validation-failed outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, linkingOutcomes.VALIDATION_FAILED)

      expect(viewModel.message).toEqual({ type: 'error', text: 'Security validation failed - please try again' })
    })

    test('reports the connection-failed message for a failed outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, linkingOutcomes.FAILED)

      expect(viewModel.message).toEqual({ type: 'error', text: 'Connection failed - please try again' })
    })

    test('reports the cancelled message for a cancelled outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, linkingOutcomes.CANCELLED)

      expect(viewModel.message).toEqual({ type: 'warning', text: 'Connection cancelled - you can try again later' })
    })

    test('carries no message when there is no outcome code', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, undefined)

      expect(viewModel.message).toBeNull()
    })

    test('reflects a linked status and its authorization url when there is no status error', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, undefined)

      expect(viewModel).toMatchObject({
        statusError: false,
        linked: true,
        linkingUrl: 'https://mural.example/authorize'
      })
    })

    test('reflects an unlinked status', () => {
      const unlinkedStatus = { statusError: false, linkingStatus: { linked: false }, authorizationUrl: 'https://mural.example/authorize' }

      const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus, undefined)

      expect(viewModel.linked).toBe(false)
    })

    test('short-circuits to a status error without reading linkingStatus or authorizationUrl', () => {
      const erroredStatus = { statusError: true, linkingStatus: null, authorizationUrl: null }

      const viewModel = LinkingStatusViewModel.fromLinkingStatus(erroredStatus, undefined)

      expect(viewModel).toMatchObject({
        statusError: true,
        linked: false,
        linkingUrl: null
      })
    })
  })
})
