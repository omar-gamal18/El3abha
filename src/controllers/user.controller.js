const db = require("../prismaClient");

const userController = {
  // 1. Get all active users
  async getAllUsers(req, res, next) {
    try {
      const users = await db.orm.public.User.select(
        "id",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
      )
        .where({ isActive: true })
        .orderBy((u) => u.createdAt.desc())
        .all();

      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  // 2. Get user by ID (primary key lookup)
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await db.orm.public.User.select(
        "id",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
      ).first({ id: Number(id) });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  // 3. Find user by email (e.g. for authentication/login)
  async getUserByEmail(email) {
    return await db.orm.public.User.where({ email }).first();
  },

  // 4. Create a new user
  async createUser(req, res, next) {
    try {
      const { name, email, phone, password, role } = req.body;

      // Check if email or phone already exists
      const existingUser = await db.orm.public.User.where((u) =>
        u.email.eq(email).or(u.phone.eq(phone)),
      ).first();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email or phone already exists",
        });
      }

      const newUser = await db.orm.public.User.select(
        "id",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
      ).create({
        name,
        email,
        phone,
        password, // remember to hash using bcrypt before saving
        role,
      });

      return res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      next(error);
    }
  },

  // 5. Update user
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, phone } = req.body;

      const updatedUser = await db.orm.public.User.where({ id: Number(id) })
        .select("id", "name", "email", "phone", "role", "updatedAt")
        .update({ name, phone });

      return res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      next(error);
    }
  },

  // 6. Soft delete user
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      await db.orm.public.User.where({ id: Number(id) }).update({
        isActive: false,
        deletedAt: new Date().toISOString(),
      });

      return res
        .status(200)
        .json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
