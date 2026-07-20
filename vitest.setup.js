// Default-on for tests: AI content visible. Tests that exercise the gated
// state (e.g. controller-gated.test.js) override this in their own beforeAll.
process.env.GUIDANCE_API_URL = 'http://localhost:8085'
process.env.MURAL_MCP_URL = 'http://localhost:8086'
