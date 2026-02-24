const jwt = require("jsonwebtoken");

const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT secret not configured");
  }

  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

module.exports = {
  generateToken,
  setAuthCookie,
};
