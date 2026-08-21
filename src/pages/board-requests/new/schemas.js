import Joi from 'joi'

const boardRequestSchema = Joi.object({
  boardId: Joi.string().trim().required().messages({
    'string.empty': 'Enter a Board ID',
    'any.required': 'Enter a Board ID'
  }),
  iao: Joi.string().trim().email({ tlds: { allow: false } }).required()
    .custom((value, helpers) => {
      if (!value.toLowerCase().endsWith('@defra.gov.uk')) {
        return helpers.error('iao.domain')
      }

      return value
    })
    .messages({
      'string.empty': 'Enter an Information Asset Owner email address',
      'any.required': 'Enter an Information Asset Owner email address',
      'string.email': 'Enter a valid email address for the Information Asset Owner',
      'iao.domain': 'Information Asset Owner must be a defra.gov.uk email address'
    }),
  reason: Joi.string().trim().min(10).max(255).required().messages({
    'string.empty': 'Enter a reason for requesting this Mural board',
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason must be at most 255 characters',
    'any.required': 'Enter a reason for requesting this Mural board'
  })
})

export {
  boardRequestSchema
}
