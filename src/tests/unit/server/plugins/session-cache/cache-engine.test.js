import { vi } from 'vitest'

import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { getCacheEngine } from '../../../../../server/plugins/session-cache/cache-engine.js'
import { config } from '../../../../../config/config.js'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function () {
    return { on: () => ({}) }
  }),
  Redis: vi.fn(function () {
    return { on: () => ({}) }
  })
}))
vi.mock('@hapi/catbox-redis')
vi.mock('../../../../../../src/infra/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('getCacheEngine', () => {
  describe('When Redis cache engine has been requested', () => {
    beforeEach(() => {
      getCacheEngine('redis')
    })

    test('sets up Redis cache', () => {
      expect(CatboxRedis).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe('When In memory cache engine has been requested', () => {
    test('sets up in-memory cache', () => {
      const engine = getCacheEngine()

      expect(engine).toBeInstanceOf(CatboxMemory)
    })
  })

  describe('When In memory cache engine has been requested in Production', () => {
    const originalIsProduction = config.get('isProduction')

    beforeEach(() => {
      config.set('isProduction', true)
    })

    afterEach(() => {
      config.set('isProduction', originalIsProduction)
    })

    test('logs a production warning', () => {
      getCacheEngine()

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('production')
      )
    })

    test('sets up in-memory cache', () => {
      const engine = getCacheEngine()

      expect(engine).toBeInstanceOf(CatboxMemory)
    })
  })
})
