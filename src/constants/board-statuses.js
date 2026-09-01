const boardStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NOT_REQUESTED: 'not-requested'
}

const boardStatusDisplay = {
  [boardStatuses.PENDING]: { label: 'Pending', tagClasses: 'govuk-tag--yellow' },
  [boardStatuses.APPROVED]: { label: 'Approved', tagClasses: 'govuk-tag--green' },
  [boardStatuses.REJECTED]: { label: 'Rejected', tagClasses: 'govuk-tag--red' },
  [boardStatuses.NOT_REQUESTED]: { label: 'Not requested', tagClasses: 'govuk-tag--grey' }
}

/**
 * Shown for a status the portal does not recognise - a value upstream has
 * added and this service has not caught up with. Better than rendering the raw
 * value, and better than rendering nothing at all.
 */
const unknownBoardStatusDisplay = { label: 'Unknown', tagClasses: 'govuk-tag--grey' }

/**
 * The statuses a board request can actually be stored in, in workflow order.
 * Drives the boards page filter, which is why it excludes `NOT_REQUESTED` -
 * there is nothing to filter for a board with no request behind it.
 */
const storedBoardStatuses = [
  boardStatuses.PENDING,
  boardStatuses.APPROVED,
  boardStatuses.REJECTED
]

export {
  boardStatuses,
  boardStatusDisplay,
  unknownBoardStatusDisplay,
  storedBoardStatuses
}
