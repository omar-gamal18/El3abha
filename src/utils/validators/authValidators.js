const { body, validationResult } = require('express-validator');
const AppError = require('../appError');

const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length) return next(new AppError(errors[0].msg, 400));
    return next();
  },
];

const email = () =>
  body('email')
    .isString()
    .withMessage('Email is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Email is required');

const passwordAtMost72Bytes = (field) =>
  body(field)
    .isString()
    .withMessage('Password is required')
    .bail()
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('Password must be 72 bytes or fewer');

exports.validateSignup = validate([email(), passwordAtMost72Bytes('password')]);
exports.validateLogin = validate([email()]);
exports.validateForgotPassword = validate([email()]);
exports.validateVerifyResetCode = validate([email()]);
exports.validateResetPassword = validate([
  passwordAtMost72Bytes('newPassword'),
]);
