const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const isProd = process.env.NODE_ENV === "production";
const allowedOrigin = "https://miss-cake.vercel.app";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (isProd) {
        return callback(origin === allowedOrigin ? null : new Error("CORS not allowed"), origin === allowedOrigin);
      }

      const localAllowed = process.env.CLIENT_URL || "http://localhost:5173";
      const allowedList = [allowedOrigin, localAllowed];
      return callback(allowedList.includes(origin) ? null : new Error("CORS not allowed"), allowedList.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(globalLimiter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
