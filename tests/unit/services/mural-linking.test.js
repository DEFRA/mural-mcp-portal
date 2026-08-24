import { vi } from 'vitest'

import { linkingOutcomes } from '../../../src/constants/linking-outcomes.js'
import {
  getLinkingStatus,
  isMuralLinked,
  completeLinking
} from '../../../src/services/mural-linking.js'

vi.mock('../../../src/infra/mural/linking.js')

import * as linkingApi from '../../../src/infra/mural/linking.js'

describe('#muralLinkingService', () => {
  describe('getLinkingStatus', () => {
    test('returns connected status without fetching auth URL', async () => {
      const statusData = { linked: true, expired: false }
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: statusData })

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toEqual(statusData)
      expect(result.statusError).toBe(false)
      expect(result.authorizationUrl).toBeNull()
      expect(linkingApi.checkLinkingStatus).toHaveBeenCalledWith('user-123')
      expect(linkingApi.getAuthorizationUrl).not.toHaveBeenCalled()
    })

    test('fetches auth URL when not connected', async () => {
      const statusData = { linked: false }
      const authData = { authorizationUrl: 'https://mural.co/oauth/authorize?state=abc' }

      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: statusData })
      linkingApi.getAuthorizationUrl.mockResolvedValue({ ok: true, status: 200, data: authData })

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toEqual(statusData)
      expect(result.statusError).toBe(false)
      expect(result.authorizationUrl).toBe('https://mural.co/oauth/authorize?state=abc')
      expect(linkingApi.getAuthorizationUrl).toHaveBeenCalledWith('user-123')
    })

    test('returns error state when status fetch fails', async () => {
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: false, status: 500, data: null })

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toBeNull()
      expect(result.statusError).toBe(true)
      expect(result.authorizationUrl).toBeNull()
      expect(linkingApi.getAuthorizationUrl).not.toHaveBeenCalled()
    })

    test('returns error state when auth URL fetch fails', async () => {
      const statusData = { linked: false }
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: statusData })
      linkingApi.getAuthorizationUrl.mockResolvedValue({ ok: false, status: 500, data: null })

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toBeNull()
      expect(result.statusError).toBe(true)
      expect(result.authorizationUrl).toBeNull()
    })

    test('returns error state when status fetch throws', async () => {
      linkingApi.checkLinkingStatus.mockRejectedValue(new Error('Network error'))

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toBeNull()
      expect(result.statusError).toBe(true)
      expect(result.authorizationUrl).toBeNull()
    })

    test('returns error state when auth URL fetch throws', async () => {
      const statusData = { linked: false }
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: statusData })
      linkingApi.getAuthorizationUrl.mockRejectedValue(new Error('Network timeout'))

      const result = await getLinkingStatus('user-123')

      expect(result.linkingStatus).toBeNull()
      expect(result.statusError).toBe(true)
      expect(result.authorizationUrl).toBeNull()
    })
  })

  describe('isMuralLinked', () => {
    test('returns true when connected', async () => {
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: { linked: true } })

      const result = await isMuralLinked('user-123')

      expect(result).toBe(true)
      expect(linkingApi.checkLinkingStatus).toHaveBeenCalledWith('user-123')
      expect(linkingApi.getAuthorizationUrl).not.toHaveBeenCalled()
    })

    test('returns false when not connected', async () => {
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: true, status: 200, data: { linked: false } })

      const result = await isMuralLinked('user-123')

      expect(result).toBe(false)
    })

    test('returns false (fails closed) when the status fetch fails', async () => {
      linkingApi.checkLinkingStatus.mockResolvedValue({ ok: false, status: 500, data: null })

      const result = await isMuralLinked('user-123')

      expect(result).toBe(false)
    })

    test('returns false (fails closed) when the status fetch throws', async () => {
      linkingApi.checkLinkingStatus.mockRejectedValue(new Error('Network error'))

      const result = await isMuralLinked('user-123')

      expect(result).toBe(false)
    })
  })

  describe('completeLinking', () => {
    test('returns success on 200', async () => {
      linkingApi.completeLinking.mockResolvedValue({ ok: true, status: 200, data: { linked: true } })

      const result = await completeLinking('user-123', { code: 'auth-code', state: 'state-xyz' })

      expect(result).toEqual({ outcome: linkingOutcomes.SUCCESS })
      expect(linkingApi.completeLinking).toHaveBeenCalledWith('user-123', { code: 'auth-code', state: 'state-xyz' })
    })

    test('returns validation_failed on 400', async () => {
      linkingApi.completeLinking.mockResolvedValue({ ok: false, status: 400, data: { detail: 'OAuth state mismatch' } })

      const result = await completeLinking('user-123', { code: 'bad-code', state: 'bad-state' })

      expect(result).toEqual({ outcome: linkingOutcomes.VALIDATION_FAILED })
    })

    test('returns failed on other non-ok statuses', async () => {
      linkingApi.completeLinking.mockResolvedValue({ ok: false, status: 500, data: null })

      const result = await completeLinking('user-123', { code: 'code', state: 'state' })

      expect(result).toEqual({ outcome: linkingOutcomes.FAILED })
    })

    test('returns failed on 503 (service unavailable)', async () => {
      linkingApi.completeLinking.mockResolvedValue({ ok: false, status: 503, data: null })

      const result = await completeLinking('user-123', { code: 'code', state: 'state' })

      expect(result).toEqual({ outcome: linkingOutcomes.FAILED })
    })

    test('returns failed when infra throws', async () => {
      linkingApi.completeLinking.mockRejectedValue(new Error('Network error'))

      const result = await completeLinking('user-123', { code: 'code', state: 'state' })

      expect(result).toEqual({ outcome: linkingOutcomes.FAILED })
    })
  })
})
