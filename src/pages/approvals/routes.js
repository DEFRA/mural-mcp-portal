import { config } from '../../config/config.js'
import * as approvalsController from './controller.js'

const allRoutes = [
  {
    method: 'GET',
    path: '/approvals',
    handler: approvalsController.getApprovals
  }
]

// Self-service access is off by default: with the flag off no routes are
// registered, so these pages 404 and board access is the MCP server's env
// allow list alone.
const routes = config.get('features.selfServiceAccess') ? allRoutes : []

export {
  routes
}
