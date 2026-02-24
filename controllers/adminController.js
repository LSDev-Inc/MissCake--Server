const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../utils/activityLogger");

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const getDashboardStats = async (req, res, next) => {
  try {
    const [users, admins, owners, categories, products] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "owner" }),
      Category.countDocuments(),
      Product.countDocuments(),
    ]);

    return res.status(200).json({
      stats: {
        users,
        admins,
        owners,
        categories,
        products,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "owner"] } })
      .select("username email role createdAt")
      .sort({ role: 1, createdAt: -1 });

    return res.status(200).json({ admins });
  } catch (error) {
    return next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error("username, email and password are required");
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error("Password must contain at least 8 characters");
    }

    const existing = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
    });

    if (existing) {
      res.status(409);
      throw new Error("Username or email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: "admin",
    });

    await logActivity({
      actor: req.user._id,
      action: "CREATED_ADMIN",
      targetType: "admin",
      targetId: admin._id,
      targetLabel: admin.username,
      details: `${req.user.username} added ${admin.username} as admin`,
    });

    return res.status(201).json({ message: "Admin created", admin: sanitizeUser(admin) });
  } catch (error) {
    return next(error);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid admin id");
    }

    const admin = await User.findById(id);
    if (!admin || !["admin", "owner"].includes(admin.role)) {
      res.status(404);
      throw new Error("Admin account not found");
    }

    if (admin.role === "owner") {
      res.status(403);
      throw new Error("Owner account cannot be modified");
    }

    if (!username && !email && !password) {
      res.status(400);
      throw new Error("Provide at least one field to update");
    }

    if (username && username.trim() !== admin.username) {
      const existingByUsername = await User.findOne({ username: username.trim() });
      if (existingByUsername) {
        res.status(409);
        throw new Error("Username already in use");
      }
      admin.username = username.trim();
    }

    if (email && email.trim().toLowerCase() !== admin.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingByEmail = await User.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        res.status(409);
        throw new Error("Email already in use");
      }
      admin.email = normalizedEmail;
    }

    if (password) {
      if (password.length < 8) {
        res.status(400);
        throw new Error("Password must contain at least 8 characters");
      }
      admin.password = await bcrypt.hash(password, 12);
    }

    await admin.save();

    await logActivity({
      actor: req.user._id,
      action: "UPDATED_ADMIN",
      targetType: "admin",
      targetId: admin._id,
      targetLabel: admin.username,
      details: `${req.user.username} updated admin ${admin.username}`,
    });

    return res.status(200).json({ message: "Admin updated", admin: sanitizeUser(admin) });
  } catch (error) {
    return next(error);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid admin id");
    }

    const admin = await User.findById(id);
    if (!admin || !["admin", "owner"].includes(admin.role)) {
      res.status(404);
      throw new Error("Admin account not found");
    }

    if (admin.role === "owner") {
      res.status(403);
      throw new Error("Owner account cannot be deleted");
    }

    await admin.deleteOne();

    await logActivity({
      actor: req.user._id,
      action: "DELETED_ADMIN",
      targetType: "admin",
      targetId: admin._id,
      targetLabel: admin.username,
      details: `${req.user.username} deleted admin ${admin.username}`,
    });

    return res.status(200).json({ message: "Admin deleted" });
  } catch (error) {
    return next(error);
  }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find()
      .populate("actor", "username role")
      .sort({ createdAt: -1 })
      .limit(300);

    return res.status(200).json({ logs });
  } catch (error) {
    return next(error);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    return res.status(200).json({ categories });
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error("Category name is required");
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      res.status(409);
      throw new Error("Category already exists");
    }

    const category = await Category.create({ name: name.trim() });

    await logActivity({
      actor: req.user._id,
      action: "CREATED_CATEGORY",
      targetType: "category",
      targetId: category._id,
      targetLabel: category.name,
      details: `${req.user.username} created category ${category.name}`,
    });

    return res.status(201).json({ message: "Category created", category });
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid category id");
    }

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error("Category name is required");
    }

    const existing = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
    if (existing) {
      res.status(409);
      throw new Error("Category name already in use");
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    await logActivity({
      actor: req.user._id,
      action: "UPDATED_CATEGORY",
      targetType: "category",
      targetId: category._id,
      targetLabel: category.name,
      details: `${req.user.username} updated category ${category.name}`,
    });

    return res.status(200).json({ message: "Category updated", category });
  } catch (error) {
    return next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid category id");
    }

    const usedByProducts = await Product.exists({ category: id });
    if (usedByProducts) {
      res.status(400);
      throw new Error("Cannot delete category used by products");
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    await logActivity({
      actor: req.user._id,
      action: "DELETED_CATEGORY",
      targetType: "category",
      targetId: category._id,
      targetLabel: category.name,
      details: `${req.user.username} deleted category ${category.name}`,
    });

    return res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboardStats,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listAuditLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
