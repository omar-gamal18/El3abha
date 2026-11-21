const { body, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_RESET_CODE_LENGTH,
} = require('../config/authConstants');

const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length) throw new AppError(errors[0].msg, 400);
    return next();
  },
];

const normalizedEmail = (message = 'A valid email is required') =>
  body('email')
    .isString()
    .withMessage(message)
    .bail()
    .customSanitizer((value) => value.trim().toLowerCase())
    .isEmail()
    .withMessage(message)
    .isLength({ max: EMAIL_MAX_LENGTH })
    .withMessage(message);

const passwordField = (field) =>
  body(field)
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .custom(
      (password) =>
        Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES,
    )
    .withMessage(`Password must be ${PASSWORD_MAX_BYTES} bytes or fewer`);

exports.validateSignup = validate([
  normalizedEmail(),
  passwordField('password'),
]);

exports.validateLogin = validate([
  normalizedEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
]);

exports.validateForgotPassword = validate([normalizedEmail()]);

exports.validateVerifyResetCode = validate([
  normalizedEmail('Invalid or expired reset code'),
  body('resetCode')
    .custom((value) =>
      (typeof value === 'string' || typeof value === 'number') &&
      new RegExp(`^\\d{${PASSWORD_RESET_CODE_LENGTH}}$`).test(String(value)),
    )
    .withMessage('Invalid or expired reset code')
    .customSanitizer((value) => String(value)),
]);

exports.validateResetPassword = validate([passwordField('newPassword')]);
