import { connectionChecks } from '../../../../src/constants/connection-checks.js'
import { connectionFailureReasons } from '../../../../src/constants/connection-failure-reasons.js'
import { linkingOutcomes } from '../../../../src/constants/linking-outcomes.js'
import { LinkingStatusViewModel } from '../../../../src/pages/linking/view-model.js'

const connectedStatus = { statusError: false, linkingStatus: { linked: true }, authorizationUrl: null }
const unlinkedStatus = { statusError: false, linkingStatus: { linked: false }, authorizationUrl: 'https://mural.example/authorize' }
const erroredStatus = { statusError: true, linkingStatus: null, authorizationUrl: null }

const stepFor = (viewModel, number) =>
  viewModel.steps.find((step) => step.number === number)

describe('LinkingStatusViewModel', () => {
  describe('constructor', () => {
    test('defaults every field when constructed with no data', () => {
      const viewModel = new LinkingStatusViewModel()

      expect(viewModel).toMatchObject({
        statusError: false,
        linked: false,
        linkingUrl: null,
        message: null,
        requiredReason: null,
        steps: []
      })
    })
  })

  describe('fromLinkingStatus', () => {
    test('reports the connected message for a successful callback outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
        outcome: linkingOutcomes.SUCCESS
      })

      expect(viewModel.message).toEqual({ type: 'success', text: 'Connected successfully!' })
    })

    test('reports the validation-failed message for a validation-failed outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
        outcome: linkingOutcomes.VALIDATION_FAILED
      })

      expect(viewModel.message).toEqual({ type: 'error', text: 'Security validation failed - please try again' })
    })

    test('reports the connection-failed message for a failed outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
        outcome: linkingOutcomes.FAILED
      })

      expect(viewModel.message).toEqual({ type: 'error', text: 'Connection failed - please try again' })
    })

    test('reports the cancelled message for a cancelled outcome', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
        outcome: linkingOutcomes.CANCELLED
      })

      expect(viewModel.message).toEqual({ type: 'warning', text: 'Connection cancelled - you can try again later' })
    })

    test('carries no message when there is no outcome code', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus)

      expect(viewModel.message).toBeNull()
    })

    test('reflects an unlinked status and its authorization url', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus)

      expect(viewModel).toMatchObject({
        statusError: false,
        linked: false,
        linkingUrl: 'https://mural.example/authorize'
      })
    })

    test('reflects a linked status', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus)

      expect(viewModel.linked).toBe(true)
    })

    test('short-circuits to a status error without reading linkingStatus or authorizationUrl', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(erroredStatus)

      expect(viewModel).toMatchObject({
        statusError: true,
        linked: false,
        linkingUrl: null
      })
    })

    test('carries the reason a gated route sent the user here', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus, {
        requiredReason: 'request a new Mural board'
      })

      expect(viewModel.requiredReason).toBe('request a new Mural board')
    })
  })

  describe('steps', () => {
    test('renders the same steps in every state, so no state is empty', () => {
      for (const status of [connectedStatus, unlinkedStatus, erroredStatus]) {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(status)

        expect(viewModel.steps.map((step) => step.number)).toEqual([1, 2, 3])
      }
    })

    test('describes the connection only, with no board-approval step', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus)

      expect(viewModel.steps.map((step) => step.title)).toEqual([
        'Sign in to the portal',
        'Connect your Mural account',
        'Check Mural MCP'
      ])
    })

    test('makes no step a link, so the connect action is offered once not twice', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus)

      for (const step of viewModel.steps) {
        expect(step.href).toBeUndefined()
      }
    })

    test('always confirms signing in, since the user is reading the page', () => {
      const viewModel = LinkingStatusViewModel.fromLinkingStatus(erroredStatus)

      expect(stepFor(viewModel, 1)).toMatchObject({ status: 'confirmed', statusText: 'Done' })
    })

    describe('the connection step', () => {
      test('is green once the account is connected', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus)

        expect(stepFor(viewModel, 2)).toMatchObject({ status: 'linked', statusText: 'Connected' })
      })

      test('reads as not connected while unconnected', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus)

        expect(stepFor(viewModel, 2)).toMatchObject({
          status: 'not-checked',
          statusText: 'Not connected'
        })
      })

      test('flags an issue when the status check itself failed', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(erroredStatus)

        expect(stepFor(viewModel, 2)).toMatchObject({ status: 'issue', statusText: 'Unavailable' })
      })
    })

    describe('the test-connection step', () => {
      const verified = (profile) => ({ state: connectionChecks.VERIFIED, profile, reason: null })

      test('goes green and names whose profile was loaded', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: verified({ firstName: 'Dev', lastName: 'User', email: 'dev@example.com' })
        })

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'working',
          statusText: 'Working',
          detail: 'Mural MCP can reach Mural as Dev User.'
        })
      })

      test('falls back to the profile email when it carries no name', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: verified({ email: 'dev@example.com' })
        })

        expect(stepFor(viewModel, 3).detail).toBe('Mural MCP can reach Mural as dev@example.com.')
      })

      test('still reports success when the profile is unusable', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: verified(null)
        })

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'working',
          detail: 'Mural MCP can reach Mural with your connection.'
        })
      })

      test('goes red and explains an unauthorized refusal in plain terms', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: connectionFailureReasons.UNAUTHORIZED }
        })

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'issue',
          statusText: 'Not working',
          detail: 'Your Mural connection has either expired or been revoked. Reconnect your account to fix it.'
        })
      })

      test('goes red and makes clear a Mural API error is unlikely to be the user\'s fault', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: connectionFailureReasons.MURAL_API_ERROR }
        })

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'issue',
          statusText: 'Not working',
          detail: 'Mural is not responding right now. This is likely a problem on Mural\'s side rather than with ' +
            'your connection - reconnecting probably will not help, but you can try if it keeps happening.'
        })
      })

      test('never leaks an internal reason code onto the page', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: 'some_future_code_nobody_wrote_copy_for' }
        })

        expect(stepFor(viewModel, 3).detail)
          .toBe('Mural MCP could not use your connection. Reconnect your account to fix it.')
      })

      test('still says how to fix it when Mural gives no reason', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: null }
        })

        expect(stepFor(viewModel, 3).detail)
          .toBe('Mural MCP could not use your connection. Reconnect your account to fix it.')
      })

      test('stays neutral when the check could not be run, rather than inventing a problem', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.UNAVAILABLE, profile: null, reason: null }
        })

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'not-checked',
          statusText: 'Not checked'
        })
        expect(stepFor(viewModel, 3).detail).toContain('may still be fine')
      })

      test('says it is waiting on a connection when there is nothing to check', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus)

        expect(stepFor(viewModel, 3)).toMatchObject({
          status: 'not-checked',
          detail: 'Runs once your Mural account is connected.'
        })
      })

      test('does not claim a check ran when the status lookup itself failed', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(erroredStatus)

        expect(stepFor(viewModel, 3).statusText).toBe('Not checked')
      })
    })

    describe('needsReconnect', () => {
      test('is set only when a stored connection has been refused', () => {
        const refused = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: null }
        })
        const working = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.VERIFIED, profile: null, reason: null }
        })
        const uncheckable = LinkingStatusViewModel.fromLinkingStatus(connectedStatus, {
          check: { state: connectionChecks.UNAVAILABLE, profile: null, reason: null }
        })

        expect(refused.needsReconnect).toBe(true)
        expect(working.needsReconnect).toBe(false)
        expect(uncheckable.needsReconnect).toBe(false)
      })

      test('is never set for someone who has not connected at all', () => {
        const viewModel = LinkingStatusViewModel.fromLinkingStatus(unlinkedStatus, {
          check: { state: connectionChecks.FAILED, profile: null, reason: null }
        })

        expect(viewModel.needsReconnect).toBe(false)
      })
    })
  })
})
