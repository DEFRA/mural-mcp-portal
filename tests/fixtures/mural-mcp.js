/**
 * Mural MCP response bodies.
 *
 * Single owner of every response shape the Mural MCP API sends, so that no
 * two tests can disagree about what upstream actually returns. Each factory
 * returns a fresh object and accepts overrides — nothing here is shared
 * mutable state.
 *
 * These are the *upstream* bodies only. The `{ok, status, data}` wrapper is
 * `src/infra/mural/client.js`'s own shape, not something the API sends, so it
 * is not modelled here.
 */

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

export {
  createdBoardRequest,
  boardRequestConflict
}
