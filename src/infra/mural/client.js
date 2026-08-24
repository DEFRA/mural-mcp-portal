import { config } from '../../config/config.js'

/**
 * MuralApiError - Error class for unexpected Mural API responses
 */
class MuralApiError extends Error {
  constructor (message, statusCode) {
    super(message)
    this.name = 'MuralApiError'
    this.statusCode = statusCode
  }

  static fromResponse (method, path, response) {
    const message =
      `Mural API ${method} ${path} ` +
      `failed: ${response.status} ${response.statusText}`

    return new MuralApiError(message, response.status)
  }
}

/**
 * RequestOptions - Options for the request function
 * @typedef {Object} RequestOptions
 * @property {string} [method] - The HTTP method (default: 'GET')
 * @property {Object<string, any>?} [body] - The request body
 * @property {string} [userId] - The user ID for authentication
 * @property {Object<string, string>?} [headers] - Additional headers
 * @property {number[]} [expected] - List of expected non-ok status codes that should be returned as {ok:false} rather than thrown
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
   * @throws {MuralApiError} - When response is not ok and status is not in expected list
   */
  async request (path, options = {}) {
    const method = options.method || 'GET'
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
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

    if (response.ok) {
      return { ok: true, status: response.status, data }
    }

    const expected = options.expected || []

    if (expected.includes(response.status)) {
      return { ok: false, status: response.status, data: null }
    }

    throw MuralApiError.fromResponse(method, path, response)
  }
}

const muralClient = new MuralClient()

export { MuralClient, MuralApiError, muralClient }
