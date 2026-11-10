const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AppError = require("./errors/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const User = db.orm.public.User;

const generateToken = (user) =>
  jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.signup = async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  const hashedPass = await bcrypt.hash(password, 12);

  const user = await User.select("id", "name", "email", "phone", "role").create(
    {
      name,
      email,
      phone,
      password: hashedPass,
      role,
    },
  );

  const token = generateToken(user);

  return sendSuccess(res, { user, token }, "User created successfully", 201);
};

exports.login = async (req, res, next) => {
  const user = await User.whereUnique({ email: req.body.email }).first();

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  const token = generateToken(user);

  return sendSuccess(res, { user, token }, "User logged in successfully", 200);
};
