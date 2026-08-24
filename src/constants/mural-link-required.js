/**
 * Session key the `muralConnection` server plugin stores a gated request's
 * context under - where to send the user back to, and why they were
 * stopped - when it redirects them to the dedicated "connect Mural" gate
 * page instead of letting the request through.
 *
 * The gate page controller reads this back to render the reason, and the
 * OAuth callback controller reads it to send a successful link back to the
 * original destination rather than the general linking/status page.
 */
const MURAL_LINK_REQUIRED_SESSION_KEY = 'muralLinkRequired'

/**
 * Fallback reason shown on the gate page when a route opts into
 * `requiresMuralLink` without giving its own `muralLinkReason` text.
 */
const DEFAULT_MURAL_LINK_REASON = 'do that'

export {
  MURAL_LINK_REQUIRED_SESSION_KEY,
  DEFAULT_MURAL_LINK_REASON
}
