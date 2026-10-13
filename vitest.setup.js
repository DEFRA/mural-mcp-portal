// Default-on for tests: AI content visible. Tests that exercise the gated
// state (e.g. controller-gated.test.js) override this in their own beforeAll.
process.env.MURAL_MCP_URL = 'http://localhost:8086'
process.env.MURAL_MCP_PUBLIC_URL = 'http://localhost:8086/mcp'

// Feature flags default off in the app; most tests exercise the full feature
// set. Tests of the flags-off state reset modules and override these.
process.env.SELF_SERVICE_ACCESS_ENABLED = 'true'
process.env.DATA_HANDLING_UPLOAD_ENABLED = 'true'

process.env.SESSION_COOKIE_PASSWORD = 'the-password-must-be-at-least-32-characters-long'
process.env.REDIS_USERNAME = 'user'
process.env.REDIS_PASSWORD = 'pass'
process.env.AUTH_PROVIDER = 'local'
process.env.ENTRA_TENANT_ID = 'fake-tenant-id'
process.env.ENTRA_CLIENT_ID = 'fake-client-id'
process.env.ENTRA_CLIENT_SECRET = 'fake-client-secret'
process.env.ENTRA_REDIRECT_HOST = 'http://localhost:3000'
