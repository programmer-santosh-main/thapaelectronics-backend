// server.js (corrected + hardened, old logic preserved)

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import sliderRoutes from "./routes/sliderRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";

import { cleanupUnverifiedUsers } from "./utils/cleanupUnverified.js";
import { startHealthChecks, stopHealthChecks } from "./utils/healthCheck.js";

dotenv.config();
connectDB();

const app = express();
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

/* =========================
   ✅ REQUIRED MIDDLEWARE
   (Missing earlier)
========================= */

// JSON & form parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// File uploads
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

/* =========================
   ✅ CORS CONFIG (FIXED)
========================= */

const rawClientEnv = process.env.CLIENT_URL || "";

const allowedOrigins = rawClientEnv
  .split(",")
  .map((u) => u.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Dev fallback
allowedOrigins.push("http://localhost:5173");

const normalizeOrigin = (origin) =>
  origin ? origin.replace(/\/$/, "") : origin;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // SSR / curl / mobile apps

    const incoming = normalizeOrigin(origin);

    if (
      allowedOrigins.includes(incoming) ||
      incoming.endsWith(".nip.io")
    ) {
      return callback(null, true);
    }

    console.log("❌ CORS Blocked:", incoming);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Apply CORS
app.use(cors(corsOptions));

// ✅ FIX: Proper preflight handling
app.options("*", cors(corsOptions));

/* =========================
   ✅ BASE ROUTE
========================= */

app.get("/", (req, res) => {
  console.log("📡 Health check endpoint hit successfully");
  res.status(200).send("✅ Admin API is running smoothly...");
});

/* =========================
   ✅ CRON CLEANUP
========================= */

setInterval(async () => {
  console.log(`[${new Date().toISOString()}] 🧹 Running scheduled cleanup...`);
  await cleanupUnverifiedUsers();
}, TWELVE_HOURS);

/* =========================
   ✅ ROUTES
========================= */

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/site", siteRoutes);
app.use("/api/seo", seoRoutes);
app.use("/", sitemapRoutes);
app.use("/health", healthRoutes);

/* =========================
   ✅ 404 HANDLER
========================= */

app.use((req, res) => {
  console.warn(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "❌ Route not found.",
  });
});

/* =========================
   ✅ GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("🔥 Global Error Handler Triggered:");
  console.error(`   • Message: ${err.message}`);
  console.error(`   • Stack: ${err.stack}`);

  if (err.message?.startsWith("Not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* =========================
   ✅ SERVER START
========================= */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log("=======================================");
  console.log("✅ Server started successfully");
  console.log(`📡 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🧩 Client URL(s): ${allowedOrigins.join(", ") || "localhost"}`);
  console.log("=======================================");

  try {
    const healthUrl = process.env.HEALTH_ROUTE;
    const intervalMs = process.env.HEALTH_INTERVAL_MS
      ? Number(process.env.HEALTH_INTERVAL_MS)
      : 100000;
    const timeoutMs = process.env.HEALTH_TIMEOUT_MS
      ? Number(process.env.HEALTH_TIMEOUT_MS)
      : 20000;

    if (healthUrl) {
      startHealthChecks({
        url: healthUrl,
        intervalMs,
        timeoutMs,
        logger: console.log,
      });
    } else {
      console.log("HEALTH_ROUTE not set; health checks are disabled.");
    }
  } catch (err) {
    console.error("Failed to start health checks:", err?.message || err);
  }
});

/* =========================
   ✅ PROCESS SAFETY
========================= */

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Promise Rejection:", err?.message || err);
  try {
    stopHealthChecks();
  } catch {}
  setTimeout(() => process.exit(1), 100);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err?.message || err);
  console.error(err?.stack || "");
  try {
    stopHealthChecks();
  } catch {}
  setTimeout(() => process.exit(1), 100);
});

/* =========================
   ✅ GRACEFUL SHUTDOWN
========================= */

const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

  try {
    stopHealthChecks();
    console.log("🧭 Health checks stopped.");
  } catch {}

  server.close((err) => {
    if (err) {
      console.error("Error closing server:", err);
      process.exit(1);
    }
    console.log("✅ Server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.warn("⚠ Could not close connections in time, forcing shutdown.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
