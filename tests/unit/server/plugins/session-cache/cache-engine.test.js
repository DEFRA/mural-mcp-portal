import { vi } from 'vitest'

import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { getCacheEngine } from '../../../../../src/server/plugins/session-cache/cache-engine.js'
import { config } from '../../../../../src/config/config.js'

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
vi.mock('@hapi/catbox-memory')
vi.mock('../../../../../src/infra/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('#getCacheEngine', () => {
  describe('when a Redis cache engine is requested', () => {
    beforeEach(() => {
      getCacheEngine('redis')
    })

    test('should set up the Redis cache', () => {
      expect(CatboxRedis).toHaveBeenCalledWith(expect.any(Object))
    })

    test('should log the expected Redis message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith('Using Redis session cache')
    })
  })

  describe('when an in-memory cache engine is requested', () => {
    beforeEach(() => {
      getCacheEngine()
    })

    test('should set up the in-memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('should log the expected CatBox memory message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })

  describe('when an in-memory cache engine is requested in production', () => {
    beforeEach(() => {
      config.set('isProduction', true)
      getCacheEngine()
    })

    test('should log the production warning message', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Catbox Memory is for local development only, it should not be used in production!'
      )
    })

    test('should set up the in-memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('should log the expected message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })
})
