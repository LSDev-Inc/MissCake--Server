const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateToken, setAuthCookie } = require("../utils/generateToken");

const protect = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Not authorized: no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Not authorized: user not found" });
    }

    req.user = user;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const refreshWindowSeconds = Number(process.env.JWT_REFRESH_WINDOW_SECONDS || 24 * 60 * 60);
    const secondsToExpire = Number(decoded.exp || 0) - nowInSeconds;

    if (secondsToExpire > 0 && secondsToExpire <= refreshWindowSeconds) {
      const renewedToken = generateToken(user._id, user.role);
      setAuthCookie(res, renewedToken);
    }

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized: token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Not authorized: invalid token" });
    }

    return res.status(503).json({ message: "Authentication service unavailable" });
  }
};

const adminOrOwnerOnly = (req, res, next) => {
  if (!req.user || !["admin", "owner"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin/Owner access required" });
  }

  next();
};

const ownerOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }

  next();
};

module.exports = {
  protect,
  adminOrOwnerOnly,
  ownerOnly,
};
