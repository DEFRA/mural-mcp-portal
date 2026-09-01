/**
 * Session key the `muralConnection` server plugin stores a gated request's
 * context under - where to send the user back to, and why they were
 * stopped - when it redirects them to the linking page instead of letting
 * the request through.
 *
 * The linking page controller reads this back to explain why the user landed
 * there, and the OAuth callback controller reads it to send a successful link
 * back to the original destination rather than to the linking page.
 */
const MURAL_LINK_REQUIRED_SESSION_KEY = 'muralLinkRequired'

/**
 * Fallback reason shown on the linking page when a route opts into
 * `requiresMuralLink` without giving its own `muralLinkReason` text.
 */
const DEFAULT_MURAL_LINK_REASON = 'do that'

export {
  MURAL_LINK_REQUIRED_SESSION_KEY,
  DEFAULT_MURAL_LINK_REASON
}
