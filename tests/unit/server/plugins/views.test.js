import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockExistsSyncFn = vi.fn()
const mockNunjucksConfigure = vi.fn()
const mockNunjucksCompile = vi.fn()
const mockConfigGet = vi.fn()

vi.mock('node:fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSyncFn
  }
}))

vi.mock('nunjucks', () => ({
  default: {
    configure: mockNunjucksConfigure,
    compile: mockNunjucksCompile
  }
}))

vi.mock('../../../../src/config/config.js', () => ({
  config: {
    get: mockConfigGet
  }
}))

describe('#viewsPlugin', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockExistsSyncFn.mockReset()
    mockNunjucksConfigure.mockReset()
    mockNunjucksCompile.mockReset()
    mockConfigGet.mockReset()

    // Set up default config mock behavior
    mockConfigGet.mockImplementation((key) => {
      const configValues = {
        root: '/home/node/app',
        assetPath: '/public',
        serviceName: 'Mural MCP Portal',
        env: 'development'
      }
      return configValues[key]
    })

    vi.resetModules()
  })

  describe('context configuration', () => {
    beforeEach(() => {
      mockExistsSyncFn.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/javascripts/application.js': {
            file: 'assets/application-Bg4qT4NN.js',
            name: 'application',
            src: 'src/client/javascripts/application.js',
            isEntry: true
          },
          'src/client/stylesheets/application.scss': {
            file: 'assets/applicationCss-hc2psTaB.css',
            name: 'applicationCss',
            src: 'src/client/stylesheets/application.scss',
            isEntry: true
          }
        })
      )

      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
    })

    test('should provide correct context properties', async () => {
      const { viewPlugin } = await import('../../../../src/server/plugins/views.js')

      const ctx = viewPlugin.options.context()

      expect(ctx).toEqual(
        expect.objectContaining({
          assetPath: '/public/assets',
          getAssetPath: expect.any(Function),
          serviceName: 'Mural MCP Portal'
        })
      )
    })

    test('should provide correct assetPath in context', async () => {
      const { viewPlugin } = await import('../../../../src/server/plugins/views.js')

      const ctx = viewPlugin.options.context()

      expect(ctx.assetPath).toBe('/public/assets')
    })

    test('should provide correct serviceName in context', async () => {
      const { viewPlugin } = await import('../../../../src/server/plugins/views.js')

      const ctx = viewPlugin.options.context()

      expect(ctx.serviceName).toBe('Mural MCP Portal')
    })

    test('should expose cspNonce when Blankie is registered', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = {
        plugins: {
          blankie: {
            nonces: { script: 'sha256-abc', style: 'sha256-def' }
          }
        }
      }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.cspNonce).toEqual({
        script: 'sha256-abc',
        style: 'sha256-def'
      })
    })

    test('should have empty cspNonce when Blankie is not registered', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = { plugins: {} }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.cspNonce).toBeUndefined()
    })

    test('should have empty cspNonce when Blankie registered but nonces not generated', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = { plugins: { blankie: {} } }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.cspNonce).toBeUndefined()
    })

    test('should expose isAuthenticated and userDisplayName when signed in', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: { profile: { displayName: 'Test User' } }
        }
      }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.isAuthenticated).toBe(true)
      expect(ctx.userDisplayName).toBe('Test User')
    })

    test('should expose isAuthenticated as false and userDisplayName as null when signed out', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = { auth: { isAuthenticated: false } }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.isAuthenticated).toBe(false)
      expect(ctx.userDisplayName).toBeNull()
    })

    test('should default isAuthenticated to false and userDisplayName to null when request.auth is missing', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const ctx = viewPlugin.options.context()

      expect(ctx.isAuthenticated).toBe(false)
      expect(ctx.userDisplayName).toBeNull()
    })

    test('should default userDisplayName to null when authenticated but profile is missing', async () => {
      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const mockRequest = { auth: { isAuthenticated: true, credentials: {} } }

      const ctx = viewPlugin.options.context(mockRequest)

      expect(ctx.userDisplayName).toBeNull()
    })
  })

  describe('vite manifest handling', () => {
    beforeEach(() => {
      mockExistsSyncFn.mockReturnValue(true)
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
    })

    test('should read vite manifest file', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/javascripts/application.js': {
            file: 'assets/application-Bg4qT4NN.js',
            name: 'application',
            src: 'src/client/javascripts/application.js',
            isEntry: true
          }
        })
      )

      await import('../../../../src/server/plugins/views.js')

      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.vite/manifest.json'),
        'utf8'
      )
    })

    test('should parse vite manifest JSON', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/javascripts/application.js': {
            file: 'assets/application-Bg4qT4NN.js',
            name: 'application',
            src: 'src/client/javascripts/application.js',
            isEntry: true
          },
          'src/client/stylesheets/application.scss': {
            file: 'assets/applicationCss-hc2psTaB.css',
            name: 'applicationCss',
            src: 'src/client/stylesheets/application.scss',
            isEntry: true
          }
        })
      )

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      // Test that getAssetPath uses the parsed manifest
      const ctx = viewPlugin.options.context()
      expect(ctx.getAssetPath('src/client/javascripts/application.js')).toBe(
        '/public/assets/application-Bg4qT4NN.js'
      )
    })
  })

  describe('loadManifest error handling', () => {
    test('should handle missing manifest file in development mode', async () => {
      mockExistsSyncFn.mockReturnValue(false)
      mockConfigGet.mockImplementation((key) => {
        const configValues = {
          root: '/home/node/app',
          assetPath: '/public',
          serviceName: 'Mural MCP Portal',
          env: 'development'
        }
        return configValues[key]
      })

      vi.resetModules()
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Vite manifest file not found')
      )

      // getAssetPath should work with empty manifest
      const ctx = viewPlugin.options.context()
      expect(ctx.getAssetPath('any-asset.js')).toBe('/public/any-asset.js')

      warnSpy.mockRestore()
    })

    test('should throw error on invalid JSON', async () => {
      mockExistsSyncFn.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('{ invalid json')
      mockConfigGet.mockImplementation((key) => {
        const configValues = {
          root: '/home/node/app',
          assetPath: '/public',
          serviceName: 'Mural MCP Portal',
          env: 'development'
        }
        return configValues[key]
      })

      vi.resetModules()
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })

      await expect(
        import('../../../../src/server/plugins/views.js')
      ).rejects.toThrow(SyntaxError)
    })

    test('should return empty manifest when file does not exist', async () => {
      mockExistsSyncFn.mockReturnValue(false)
      mockConfigGet.mockImplementation((key) => {
        const configValues = {
          root: '/home/node/app',
          assetPath: '/public',
          serviceName: 'Mural MCP Portal',
          env: 'development'
        }
        return configValues[key]
      })

      vi.resetModules()
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')

      const ctx = viewPlugin.options.context()

      // When manifest is empty/missing, asset path should be returned as-is
      expect(ctx.getAssetPath('src/client/javascripts/app.js')).toBe(
        '/public/src/client/javascripts/app.js'
      )

      console.warn.mockRestore()
    })
  })

  describe('getAssetPath', () => {
    beforeEach(() => {
      mockExistsSyncFn.mockReturnValue(true)
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
    })

    test('should return versioned asset path when asset exists in manifest', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/javascripts/application.js': {
            file: 'assets/application-Bg4qT4NN.js',
            name: 'application',
            src: 'src/client/javascripts/application.js',
            isEntry: true
          },
          'src/client/stylesheets/application.scss': {
            file: 'assets/applicationCss-hc2psTaB.css',
            name: 'applicationCss',
            src: 'src/client/stylesheets/application.scss',
            isEntry: true
          }
        })
      )

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { getAssetPath } = viewPlugin.options.context()

      expect(getAssetPath('src/client/javascripts/application.js')).toBe(
        '/public/assets/application-Bg4qT4NN.js'
      )
      expect(getAssetPath('src/client/stylesheets/application.scss')).toBe(
        '/public/assets/applicationCss-hc2psTaB.css'
      )
    })

    test('should return original asset path when asset does not exist in manifest', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/javascripts/application.js': {
            file: 'assets/application-Bg4qT4NN.js',
            name: 'application',
            src: 'src/client/javascripts/application.js',
            isEntry: true
          }
        })
      )

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { getAssetPath } = viewPlugin.options.context()

      expect(getAssetPath('src/client/images/unknown-asset.png')).toBe(
        '/public/src/client/images/unknown-asset.png'
      )
    })

    test('should handle empty manifest', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({}))

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { getAssetPath } = viewPlugin.options.context()

      expect(getAssetPath('src/client/javascripts/any-asset.js')).toBe(
        '/public/src/client/javascripts/any-asset.js'
      )
    })

    test('should return versioned path for defra-logo image', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'src/client/images/defra-logo.svg': {
            file: 'assets/defra-logo-abc123def.svg',
            src: 'src/client/images/defra-logo.svg'
          }
        })
      )

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { getAssetPath } = viewPlugin.options.context()

      expect(getAssetPath('src/client/images/defra-logo.svg')).toBe(
        '/public/assets/defra-logo-abc123def.svg'
      )
    })

    test('should support backwards compatibility with string manifest values', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          'application.js': 'javascripts/application.abc123.js'
        })
      )

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { getAssetPath } = viewPlugin.options.context()

      expect(getAssetPath('application.js')).toBe(
        '/public/javascripts/application.abc123.js'
      )
    })
  })

  describe('template compilation', () => {
    beforeEach(() => {
      mockExistsSyncFn.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({}))
      mockNunjucksConfigure.mockReturnValue({ addFilter: vi.fn() })
    })

    test('should compile templates with nunjucks environment', async () => {
      const mockTemplate = { render: vi.fn().mockReturnValue('<html></html>') }
      mockNunjucksCompile.mockReturnValue(mockTemplate)

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { compile } = viewPlugin.options.engines.njk

      const mockEnvironment = {}
      const compiledTemplate = compile('<html>{{ title }}</html>', {
        environment: mockEnvironment
      })

      expect(mockNunjucksCompile).toHaveBeenCalledWith(
        '<html>{{ title }}</html>',
        mockEnvironment
      )
      expect(compiledTemplate).toBeInstanceOf(Function)
    })

    test('should render compiled template with context', async () => {
      const mockTemplate = {
        render: vi.fn().mockReturnValue('<html>Test</html>')
      }
      mockNunjucksCompile.mockReturnValue(mockTemplate)

      const { viewPlugin } =
        await import('../../../../src/server/plugins/views.js')
      const { compile } = viewPlugin.options.engines.njk

      const compiledTemplate = compile('<html>{{ title }}</html>', {
        environment: {}
      })
      const result = compiledTemplate({ title: 'Test' })

      expect(mockTemplate.render).toHaveBeenCalledWith({ title: 'Test' })
      expect(result).toBe('<html>Test</html>')
    })
  })
})
