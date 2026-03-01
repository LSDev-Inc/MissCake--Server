const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken, setAuthCookie, clearAuthCookie } = require("../utils/generateToken");

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const registerUser = async (req, res, next) => {
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

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token, req);

    return res.status(201).json({
      message: "User registered successfully",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { usernameOrEmail, password, accountType = "user" } = req.body;

    if (!["user", "admin"].includes(accountType)) {
      res.status(400);
      throw new Error("Invalid account type");
    }

    if (!usernameOrEmail || !password) {
      res.status(400);
      throw new Error("username/email and password are required");
    }

    const normalized = usernameOrEmail.trim();
    const user = await User.findOne({
      $or: [{ username: normalized }, { email: normalized.toLowerCase() }],
    });

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (accountType === "admin" && !["admin", "owner"].includes(user.role)) {
      res.status(403);
      throw new Error("Admin account required");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token, req);

    return res.status(200).json({
      message: "Login successful",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return next(error);
  }
};

const logoutUser = async (req, res) => {
  clearAuthCookie(res, req);

  return res.status(200).json({ message: "Logged out" });
};

const getMe = async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
};

const updateMe = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username && !email && !password) {
      res.status(400);
      throw new Error("At least one field is required");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (username) {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        res.status(400);
        throw new Error("Username must contain at least 3 characters");
      }

      const existingByUsername = await User.findOne({
        username: trimmedUsername,
        _id: { $ne: user._id },
      });
      if (existingByUsername) {
        res.status(409);
        throw new Error("Username already in use");
      }

      user.username = trimmedUsername;
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingByEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingByEmail) {
        res.status(409);
        throw new Error("Email already in use");
      }

      user.email = normalizedEmail;
    }

    if (password) {
      if (password.length < 8) {
        res.status(400);
        throw new Error("Password must contain at least 8 characters");
      }
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
};
