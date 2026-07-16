import * as undici from 'undici'
import * as globalAgent from 'global-agent'

import { createLogger } from '../logging/logger.js'
import { config } from '../../config/config.js'

const logger = createLogger()

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for a number of http clients.
 * Node Fetch will still need to pass a ProxyAgent in on each call.
 */
function setupProxy () {
  const proxyUrl = config.get('httpProxy')

  if (proxyUrl) {
    logger.info('setting up global proxies')

    // Undici proxy
    undici.setGlobalDispatcher(new undici.ProxyAgent(proxyUrl))

    // global-agent (axios/request/and others)
    globalAgent.bootstrap()
    global.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
  }
}

export {
  setupProxy
}
