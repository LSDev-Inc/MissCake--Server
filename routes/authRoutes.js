const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;
