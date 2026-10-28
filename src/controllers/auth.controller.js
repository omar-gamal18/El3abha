const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const User = db.orm.public.User;

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

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return sendSuccess(res, { user, token }, "User created successfully", 201);
};
