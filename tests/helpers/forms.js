/**
 * Encodes form fields as `application/x-www-form-urlencoded`.
 *
 * @param {object} fields - form field key-value pairs
 * @returns {string} encoded form body
 */
function form (fields) {
  return new URLSearchParams(fields).toString()
}

export { form }
