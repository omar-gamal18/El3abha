const { body } = require("express-validator");

const AppError = require("../utils/AppError");

const name = body("name")
  .trim()
  .notEmpty()
  .withMessage("Name is required")
  .isLength({ min: 2, max: 30 })
  .withMessage("Name must be 2-30 characters");

const email = body("email")
  .trim()
  .toLowerCase()
  .notEmpty()
  .withMessage("Email is required")
  .isEmail()
  .withMessage("Invalid email address");

const phone = body("phone")
  .trim()
  .notEmpty()
  .withMessage("Phone is required")
  .isMobilePhone("ar-EG")
  .withMessage("Phone must be a valid Egyptian mobile number");

const password = body("password")
  .notEmpty()
  .withMessage("Password is required")
  .isLength({ min: 8, max: 20 })
  .withMessage("Password must be 8-20 characters")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain a letter")
  .matches(/\d/)
  .withMessage("Password must contain a number");

const role = body("role")
  .trim()
  .notEmpty()
  .withMessage("Role is required")
  .isIn(["player", "owner"])
  .withMessage("Role must be player or owner");

exports.registerValidator = [name, email, phone, password, role];

exports.loginValidator = [
  email,
  body("password").notEmpty().withMessage("Password is required"),
];

exports.forgotPasswordValidator = [email];

exports.verifyResetCodeValidator = [
  email,
  body("code")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
];

exports.resetPasswordValidator = [email, password];
