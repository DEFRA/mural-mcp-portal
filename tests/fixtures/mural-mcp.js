/**
 * Body of `POST /approvals/boards` on 201 Created.
 *
 * Verified by reading the consumers: `src/infra/mural/client.js` derives `ok`
 * from the HTTP status and never inspects the body, `src/services/board-requests.js`
 * passes `res.data` straight through, and `src/pages/board-requests/new/controller.js`
 * builds its yar payload from the submitted request rather than the response.
 * Nothing in `src/` reads a `success` field, so the body is a plain resource
 * representation — the same shape `GET /approvals/boards/{boardId}` returns.
 *
 * @param {Object} [overrides] - Fields to override on the representation
 * @returns {{id: string, boardId: string, status: string}}
 */
function createdBoardRequest (overrides = {}) {
  return {
    id: 'req-1',
    boardId: 'board-abc',
    status: 'pending',
    ...overrides
  }
}

/**
 * Body of `POST /approvals/boards` on 409 Conflict.
 *
 * Verified against `src/infra/mural/client.js`: 409 is passed as an `expected`
 * status by `src/infra/mural/approvals.js`, and the client returns
 * `{ok: false, status, data: null}` for expected statuses — it discards the
 * body. So this shape is documentation of what upstream sends; no production
 * code reads it.
 *
 * @param {Object} [overrides] - Fields to override on the error body
 * @returns {{message: string}}
 */
function boardRequestConflict (overrides = {}) {
  return {
    message: 'Board approval request already exists',
    ...overrides
  }
}

/**
 * One element of `GET /admin/access-requests`, and the body of
 * `GET /approvals/boards/{boardId}` on 200.
 *
 * Verified against `BoardAccessRequest` in
 * `../mural-mcp/app/integration/mural/models.py`, whose pydantic model uses
 * `alias_generator=to_camel` — so every field crosses the wire camelCased.
 * `approved` is a computed field upstream; nothing in `src/` reads it, so it
 * is omitted here rather than modelled inaccurately.
 *
 * Note upstream carries no board *title*: `mural-mcp` does not proxy Mural's
 * mural-detail endpoint, which is why the boards directory falls back to the
 * board id as its display name.
 *
 * @param {Object} [overrides] - Fields to override on the representation
 * @returns {Object}
 */
function accessRequest (overrides = {}) {
  return {
    id: 'req-1',
    userId: 'requester@defra.gov.uk',
    boardId: 'board-abc',
    reason: 'Need this board for a workshop',
    iao: 'iao@defra.gov.uk',
    status: 'pending',
    reviewerId: null,
    decisionReason: null,
    dataHandlingFormRef: null,
    riskAssessmentRef: null,
    createdAt: '2026-08-21T11:40:00.000Z',
    decidedAt: null,
    ...overrides
  }
}

/**
 * Body of `GET /admin/access-requests` on 200 - a bare JSON array.
 *
 * Verified against `list_pending_access_requests` in
 * `../mural-mcp/app/infra/rest/admin_router.py`, whose return annotation is
 * `list[BoardAccessRequest]`, so FastAPI serialises it with no envelope.
 * Upstream returns *pending* requests only and accepts no filters.
 *
 * @param {Object[]} [requests] - Requests to return
 * @returns {Object[]}
 */
function accessRequestList (requests = [accessRequest()]) {
  return requests
}

/**
 * Body of `POST /tokens` on 201 Created.
 *
 * Verified against `MintedTokenResponse` in
 * `../mural-mcp/app/infra/rest/token_router.py`. That router's pydantic models
 * are plain - no `alias_generator` - so unlike every other shape in this file
 * its fields cross the wire in `snake_case`. `services/personal-tokens.js` is
 * the one place that maps them.
 *
 * `token` is the plaintext secret, `mmcp_` + `secrets.token_urlsafe(32)`, and
 * appears in this response and nowhere else - upstream persists only its
 * SHA-256 hash.
 *
 * @param {Object} [overrides] - Fields to override on the representation
 * @returns {{id: string, token: string, label: string, expires_at: string}}
 */
function mintedToken (overrides = {}) {
  return {
    id: 'pat_3f9c1a2b4d5e6f708192a3b4c5d6e7f8',
    token: 'example-token-for-testing',
    label: 'Claude Code',
    expires_at: '2026-11-28T10:15:30.123456Z',
    ...overrides
  }
}

/**
 * One element of `GET /tokens` on 200.
 *
 * Verified against `TokenSummaryResponse` in the same router. Note what is
 * absent: there is no `token` field - the integration test upstream asserts
 * that explicitly - and no status field either, which is why
 * `services/personal-tokens.js` derives Active/Expired/Revoked from
 * `revoked_at` and `expires_at`.
 *
 * `prefix` is the first 13 characters of the secret, stored by upstream for
 * display so a user can tell their tokens apart.
 *
 * @param {Object} [overrides] - Fields to override on the representation
 * @returns {Object}
 */
function tokenSummary (overrides = {}) {
  return {
    id: 'pat_3f9c1a2b4d5e6f708192a3b4c5d6e7f8',
    label: 'Claude Code',
    prefix: 'mmcp_xJ8v3kQz',
    created_at: '2026-08-30T10:15:30.123456Z',
    expires_at: '2026-11-28T10:15:30.123456Z',
    last_used_at: null,
    revoked_at: null,
    ...overrides
  }
}

/**
 * Body of `GET /tokens` on 200 - a bare JSON array.
 *
 * The return annotation upstream is `list[TokenSummaryResponse]`, so FastAPI
 * serialises it with no envelope.
 *
 * @param {Object[]} [tokens] - Tokens to return
 * @returns {Object[]}
 */
function tokenList (tokens = [tokenSummary()]) {
  return tokens
}

export {
  createdBoardRequest,
  boardRequestConflict,
  accessRequest,
  accessRequestList,
  mintedToken,
  tokenSummary,
  tokenList
}
