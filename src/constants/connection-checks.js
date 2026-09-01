/**
 * Outcomes of asking the Mural MCP server to prove a stored connection works
 * (see `testConnection` in `infra/mural/linking.js`).
 *
 * `UNAVAILABLE` is deliberately distinct from `FAILED`. Not being able to run
 * the check - because the server has not shipped the endpoint yet, or is down -
 * says nothing about the connection, and must not be shown to the user as a
 * broken one. Only `FAILED` means Mural actually refused the token.
 */
const connectionChecks = {
  VERIFIED: 'verified',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable'
}

export {
  connectionChecks
}
