import nock from 'nock'

const MURAL_MCP_URL = 'http://localhost:8086'

describe('feature flags off', () => {
  let server
  let authCookie

  beforeAll(async () => {
    vi.resetModules()
    process.env.SELF_SERVICE_ACCESS_ENABLED = 'false'
    process.env.DATA_HANDLING_UPLOAD_ENABLED = 'false'
    process.env.CDP_UPLOADER_BROWSER_URL = 'http://localhost:7337'

    const { createServer } = await import('../../../src/server/server.js')
    const { loginAsDevUser } = await import('../../helpers/login.js')

    server = await createServer()
    await server.initialize()
    nock.disableNetConnect()
    authCookie = await loginAsDevUser(server)
  })

  afterAll(async () => {
    process.env.SELF_SERVICE_ACCESS_ENABLED = 'true'
    process.env.DATA_HANDLING_UPLOAD_ENABLED = 'true'
    delete process.env.CDP_UPLOADER_BROWSER_URL
    nock.enableNetConnect()
    await server.stop({ timeout: 0 })
    vi.resetModules()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test.each(['/approvals', '/board-requests/new'])('%s returns 404', async (url) => {
    const response = await server.inject({ method: 'GET', url, headers: { Cookie: authCookie } })

    expect(response.statusCode).toBe(404)
  })

  test('dashboard hides the approvals and request tiles and nav items', async () => {
    nock(MURAL_MCP_URL).get('/linking/status').reply(200, { linked: true })

    const response = await server.inject({ method: 'GET', url: '/dashboard', headers: { Cookie: authCookie } })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('href="/boards"')
    expect(response.result).not.toContain('href="/approvals"')
    expect(response.result).not.toContain('href="/board-requests/new"')
  })

  test('applies the content security policy even when a CDP Uploader browser URL is set', async () => {
    const response = await server.inject({ method: 'GET', url: '/' })

    expect(response.headers['content-security-policy']).toContain("default-src 'self'")
  })
})
