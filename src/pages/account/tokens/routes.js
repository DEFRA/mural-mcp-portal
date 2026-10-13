import * as tokensController from './controller.js'
import { mintTokenSchema, revokeTokenSchema } from './schemas.js'

const muralLinkOptions = {
  requiresMuralLink: true,
  muralLinkReason: 'generate a access token'
}

const routes = [
  {
    method: 'GET',
    path: '/account/tokens',
    options: {
      app: muralLinkOptions
    },
    handler: tokensController.getTokens
  },
  {
    method: 'GET',
    path: '/account/tokens/new',
    options: {
      app: muralLinkOptions
    },
    handler: tokensController.getNewToken
  },
  {
    method: 'POST',
    path: '/account/tokens/new',
    options: {
      app: muralLinkOptions,
      validate: {
        payload: mintTokenSchema,
        failAction: tokensController.postNewTokenFailAction
      }
    },
    handler: tokensController.postNewToken
  },
  {
    method: 'GET',
    path: '/account/tokens/created',
    options: {
      app: muralLinkOptions
    },
    handler: tokensController.getCreatedToken
  },
  {
    method: 'GET',
    path: '/account/tokens/{tokenId}/revoke',
    options: {
      app: muralLinkOptions
    },
    handler: tokensController.getRevokeToken
  },
  {
    method: 'POST',
    path: '/account/tokens/{tokenId}/revoke',
    options: {
      app: muralLinkOptions,
      validate: {
        payload: revokeTokenSchema
      }
    },
    handler: tokensController.postRevokeToken
  }
]

export {
  routes
}
