import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../src/config/config.js'
import { buildRedisClient } from '../../../src/infra/redis-client.js'

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function () {
    return { on: () => ({}) }
  }),
  Redis: vi.fn(function () {
    return { on: () => ({}) }
  })
}))

describe('#buildRedisClient', () => {
  describe('when a Redis single instance cache is requested', () => {
    beforeEach(() => {
      buildRedisClient(config.get('redis'))
    })

    test('should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith({
        db: 0,
        host: '127.0.0.1',
        keyPrefix: 'mcp-registry:',
        port: 6379,
        username: 'user',
        password: 'pass'
      })
    })
  })

  describe('when a Redis cluster is requested', () => {
    beforeEach(() => {
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('should instantiate a Redis cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: '127.0.0.1', port: 6379 }],
        {
          dnsLookup: expect.any(Function),
          keyPrefix: 'mcp-registry:',
          redisOptions: { db: 0, password: 'pass', tls: {}, username: 'user' },
          slotsRefreshTimeout: 10000
        }
      )
    })
  })
})
