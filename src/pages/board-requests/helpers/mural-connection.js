function hasMuralConnection (request) {
  return !!request.yar.get('muralConnected')
}

export {
  hasMuralConnection
}
