import { config } from '../../config/config.js'

/**
 * RequestOptions - Options for the request function
 * @typedef {Object} RequestOptions
 * @property {string} [method] - The HTTP method (default: 'GET')
 * @property {Object<string, any>?} [body] - The request body
 * @property {string} [userId] - The user ID for authentication
 * @property {Object<string, string>?} [headers] - Additional headers
 */

class MuralClient {
  /**
   * Create a new Mural API client
   * @param {string} [baseUrl] - The base URL for the API (defaults to config)
   */
  constructor (baseUrl) {
    this.baseUrl = baseUrl || config.get('muralMcp.url')
  }

  /**
   * Make an HTTP request to the Mural MCP API
   *
   * @param {string} path - The API endpoint path
   * @param {RequestOptions} [options] - The request options
   * @returns {Promise<{ok: boolean, status: number, data: any}>} - The response object
   */
  async request (path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        'X-User-Id': options.userId,
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    return { ok: response.ok, status: response.status, data }
  }
}

const muralClient = new MuralClient()

export { MuralClient, muralClient }
