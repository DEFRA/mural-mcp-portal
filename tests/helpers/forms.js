const MULTIPART_BOUNDARY = '----mural-mcp-portal-test-boundary'

/**
 * Encodes form fields as `application/x-www-form-urlencoded`.
 *
 * @param {object} fields - form field key-value pairs
 * @returns {string} encoded form body
 */
function form (fields) {
  return new URLSearchParams(fields).toString()
}

/**
 * Encodes form fields and an optional file as `multipart/form-data`, for the
 * routes that accept an upload.
 *
 * Built by hand rather than with FormData because `server.inject` takes a
 * string or Buffer payload and needs the matching Content-Type header, which
 * `multipartHeaders` returns.
 *
 * Pass `file: null` to submit the form with the file input left empty - that
 * still sends a part, with an empty filename, exactly as a browser does.
 *
 * @param {object} fields - form field key-value pairs
 * @param {{name: string, filename: string, content: string|Buffer, contentType?: string}} [file]
 * @returns {Buffer} encoded form body
 */
function multipart (fields, file) {
  const parts = []

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${MULTIPART_BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${value}\r\n`
    )
  }

  if (file !== undefined) {
    const filename = file?.filename ?? ''
    const contentType = file?.contentType ?? 'application/octet-stream'

    parts.push(
      `--${MULTIPART_BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="${file?.name ?? 'file'}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n` +
      `${file?.content ?? ''}\r\n`
    )
  }

  parts.push(`--${MULTIPART_BOUNDARY}--\r\n`)

  return Buffer.from(parts.join(''))
}

/**
 * The Content-Type header that goes with a `multipart` body.
 *
 * @returns {{'content-type': string}}
 */
function multipartHeaders () {
  return { 'content-type': `multipart/form-data; boundary=${MULTIPART_BOUNDARY}` }
}

export { form, multipart, multipartHeaders }
