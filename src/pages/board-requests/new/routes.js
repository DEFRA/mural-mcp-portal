import * as boardRequestController from './controller.js'
import { boardRequestSchema } from './schemas.js'

/**
 * Kept behind `requiresMuralLink` even though submitting a request only writes
 * to mural-mcp's governance store today, and so does not currently need a
 * Mural token.
 *
 * The gate is here for what comes next: requesting a board is to be extended
 * with a check that the requester can actually reach the board in Mural, which
 * does need their connection. The same check is planned on the Information
 * Asset Owner's decision page, and `/approvals/{requestId}` will need this
 * option adding at that point.
 *
 * The boards listing and board page are deliberately ungated - see
 * `pages/boards/routes.js`.
 */
const routes = [
  {
    method: 'GET',
    path: '/board-requests/new',
    options: {
      app: { requiresMuralLink: true, muralLinkReason: 'request a new Mural board' }
    },
    handler: boardRequestController.getNewBoardRequest
  },
  {
    method: 'POST',
    path: '/board-requests/new',
    options: {
      app: { requiresMuralLink: true, muralLinkReason: 'request a new Mural board' },
      validate: {
        payload: boardRequestSchema,
        failAction: boardRequestController.postBoardRequestFailAction
      }
    },
    handler: boardRequestController.postBoardRequest
  }
]

export {
  routes
}
