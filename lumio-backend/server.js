const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Behind a reverse proxy (Render/Railway/etc.), so req.ip and rate-limiting
// see the real client IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10kb" }));

const localhostOriginRx = /^http:\/\/localhost:\d+$/;
const extraOrigins = (process.env.EXTRA_CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || localhostOriginRx.test(origin) || extraOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// General ceiling so no single client can flood the API.
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Tighter limit on auth endpoints to slow down credential-stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// ── Mailer ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ── DB Connection Pool ──────────────────────────────────────────
// Hosted MySQL providers (e.g. Aiven) require TLS; local MySQL doesn't.
const dbSsl = process.env.DB_SSL === "true"
  ? { ca: process.env.DB_CA_CERT, rejectUnauthorized: true }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "lumio",
  ssl: dbSsl,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 15,
  queueLimit: 0,
  enableKeepAlive: true,
});

// Idle-connection errors (e.g. the DB dropping a connection) otherwise
// surface as an unhandled 'error' event and crash the process.
pool.on("error", (err) => {
  console.error("MySQL pool error:", err.message);
});

// ── Init Tables ─────────────────────────────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "lumio"}\``);
    await conn.query(`USE \`${process.env.DB_NAME || "lumio"}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        text TEXT NOT NULL,
        done TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Database & tables ready.");
  } finally {
    conn.release();
  }
}

// ── Auth Middleware ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// GET /api/health — used by hosting platforms to check the process is alive
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/auth/signup
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required." });

  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email))
    return res.status(400).json({ error: "Invalid email address." });

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing.length > 0)
      return res.status(409).json({ error: "An account with this email already exists." });

    const id = "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [id, name.trim(), email.toLowerCase(), password_hash]
    );

    const token = jwt.sign({ id, name: name.trim(), email: email.toLowerCase() }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user: { id, name: name.trim(), email: email.toLowerCase() } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if (rows.length === 0)
      return res.status(401).json({ error: "No account found with that email. Please sign up first." });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Incorrect password. Please try again." });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /api/auth/forgot-password
app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim())
    return res.status(400).json({ error: "Email is required." });

  const genericMsg = { message: "If an account exists for that email, a reset link has been sent." };

  try {
    const [rows] = await pool.query("SELECT id, name FROM users WHERE email = ?", [email.trim().toLowerCase()]);
    if (rows.length === 0) return res.json(genericMsg);

    const user = rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const id = "rst_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [id, user.id, tokenHash, expiresAt]
    );

    const resetLink = `${FRONTEND_URL}/?resetToken=${rawToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email.trim().toLowerCase(),
      subject: "Reset your Lumio password",
      html: `
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your Lumio password. This link expires in 1 hour.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    res.json(genericMsg);
  } catch (err) {
    console.error("Forgot-password error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /api/auth/reset-password
app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password)
    return res.status(400).json({ error: "Token and new password are required." });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await pool.query(
      "SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW()",
      [tokenHash]
    );
    if (rows.length === 0)
      return res.status(400).json({ error: "This reset link is invalid or has expired." });

    const reset = rows[0];
    const password_hash = await bcrypt.hash(password, 12);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, reset.user_id]);
    await pool.query("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id]);

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    console.error("Reset-password error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ══════════════════════════════════════════════════════════════
// TASK ROUTES  (all protected)
// ══════════════════════════════════════════════════════════════

// GET /api/tasks  — fetch all tasks for logged-in user
app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(rows.map((t) => ({ ...t, done: !!t.done })));
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ error: "Could not fetch tasks." });
  }
});

// POST /api/tasks  — create a task
app.post("/api/tasks", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: "Task text is required." });

  // Date.now() alone collides when two requests land in the same millisecond
  // under concurrent load; padding with random digits keeps it unique.
  const id = Date.now() * 1000 + crypto.randomInt(0, 1000);
  try {
    await pool.query(
      "INSERT INTO tasks (id, user_id, text, done) VALUES (?, ?, ?, 0)",
      [id, req.user.id, text.trim()]
    );
    res.status(201).json({ id, user_id: req.user.id, text: text.trim(), done: false });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ error: "Could not create task." });
  }
});

// PUT /api/tasks/:id  — update text or done status
app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { text, done } = req.body;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Task not found." });

    const updated = {
      text: text !== undefined ? text.trim() : rows[0].text,
      done: done !== undefined ? (done ? 1 : 0) : rows[0].done,
    };

    await pool.query(
      "UPDATE tasks SET text = ?, done = ? WHERE id = ? AND user_id = ?",
      [updated.text, updated.done, id, req.user.id]
    );

    res.json({ id: Number(id), user_id: req.user.id, text: updated.text, done: !!updated.done });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ error: "Could not update task." });
  }
});

// DELETE /api/tasks/:id
app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: "Could not delete task." });
  }
});

// 404 for unmatched routes
app.use((req, res) => res.status(404).json({ error: "Not found." }));

// Catch-all error handler — covers things like malformed JSON bodies
// (express.json() calls next(err) for those) so they return clean JSON
// instead of leaking a stack trace or an HTML error page.
app.use((err, req, res, next) => {
  console.error("Unhandled request error:", err.message);
  res.status(err.status || 500).json({ error: "Server error. Please try again." });
});

// A bug in one request shouldn't take down every other user's connection.
// Log it and keep serving; only exit on uncaughtException, where process
// state may be corrupted, and let the host's process manager restart us.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
initDB().then(() => {
  const server = app.listen(PORT, () => console.log(`🚀 Lumio API running on http://localhost:${PORT}`));

  const shutdown = () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}).catch((err) => {
  console.error("❌ Failed to connect to MySQL:", err.message);
  process.exit(1);
});