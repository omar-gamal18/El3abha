const { body, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_RESET_CODE_LENGTH,
} = require('../config/authConstants');

/**
 * Appends shared validation-result handling to a set of input rules.
 * @param {Array<import('express-validator').ValidationChain>} chains field rules
 * @returns {Array<Function>} route middleware
 * @throws {AppError} 400 when validation fails
 */
const validate = (chains) => [
  ...chains,
  /**
   * Throws the first collected validation error or continues to the next middleware.
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @param {import('express').NextFunction} next next middleware
   * @returns {void}
   * @throws {AppError} 400 for invalid input
   */
  (req, res, next) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length) throw new AppError(errors[0].msg, 400);
    return next();
  },
];

/**
 * Validates and normalizes an email address.
 * @param {string} message validation failure message
 * @returns {import('express-validator').ValidationChain} email rule
 * @throws {AppError} 400 when the email is invalid
 */
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

/**
 * Validates a required non-empty password against bcrypt's byte limit.
 * @param {string} field request body field
 * @returns {import('express-validator').ValidationChain} password rule
 * @throws {AppError} 400 when the password is missing or oversized
 */
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

/**
 * Validates signup input.
 * @returns {Array<Function>} signup validation middleware
 * @throws {AppError} 400 for invalid email or password
 */
exports.validateSignup = validate([
  normalizedEmail(),
  passwordField('password'),
]);

/**
 * Validates login email and non-empty password without strength rules.
 * @returns {Array<Function>} login validation middleware
 * @throws {AppError} 400 for invalid email or missing password
 */
exports.validateLogin = validate([
  normalizedEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
]);

/**
 * Validates and normalizes forgot-password email.
 * @returns {Array<Function>} forgot-password validation middleware
 * @throws {AppError} 400 for invalid email
 */
exports.validateForgotPassword = validate([normalizedEmail()]);

/**
 * Validates email and a six-digit string or number reset code.
 * @returns {Array<Function>} reset-code validation middleware
 * @throws {AppError} 400 with the generic reset-code message for invalid input
 */
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

/**
 * Validates a required new password against bcrypt's byte limit.
 * @returns {Array<Function>} reset-password validation middleware
 * @throws {AppError} 400 for missing or oversized password
 */
exports.validateResetPassword = validate([passwordField('newPassword')]);
