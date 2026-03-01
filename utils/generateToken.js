const jwt = require("jsonwebtoken");

const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT secret not configured");
  }

  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const normalizeForwardedProto = (value) => {
  if (!value) return "";
  return String(value).split(",")[0].trim().toLowerCase();
};

const shouldUseSecureCookie = (req) => {
  const forcedSecure = process.env.COOKIE_SECURE;
  if (forcedSecure === "true") return true;
  if (forcedSecure === "false") return false;

  const forwardedProto = normalizeForwardedProto(req?.headers?.["x-forwarded-proto"]);
  const isSecureRequest = Boolean(req?.secure) || forwardedProto === "https";
  return isSecureRequest;
};

const getAuthCookieOptions = (req) => {
  const secure = shouldUseSecureCookie(req);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
  };
};

const setAuthCookie = (res, token, req) => {
  const baseOptions = getAuthCookieOptions(req);

  res.cookie("token", token, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res, req) => {
  const baseOptions = getAuthCookieOptions(req);

  res.cookie("token", "", {
    ...baseOptions,
    expires: new Date(0),
    maxAge: 0,
  });
};

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
};
