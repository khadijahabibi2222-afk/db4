import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS – required for Render deployment
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Multer – memory storage (Render has no persistent disk) ─────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

// ─── Mongoose Models ──────────────────────────────────────────────────────────
const studentSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  age:       String,
  phone:     String,
  gender:    String,
  school:    String,
  photo:     { data: Buffer, contentType: String },
  createdAt: { type: Date, default: Date.now },
});

const Student = mongoose.model("Student", studentSchema);

// ─── Token helpers (no extra deps – pure Node crypto) ────────────────────────
function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const body   = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig    = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "changeme_in_env")
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "changeme_in_env")
      .update(`${header}.${body}`)
      .digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth  = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── LOGIN ── THIS was the missing piece causing the hang ─────────────────────
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";

  if (username === adminUser && password === adminPass) {
    const token = signToken({ sub: username, exp: Date.now() + 24 * 60 * 60 * 1000 });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: "Invalid credentials" });
});

// Session check – frontend calls this on page load
app.get("/api/auth/check", requireAuth, (req, res) => {
  res.json({ authenticated: true });
});

// ─── Students ─────────────────────────────────────────────────────────────────
app.get("/api/students", requireAuth, async (req, res) => {
  try {
    const data = await Student.find().select("-photo.data").sort({ createdAt: -1 });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/students", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const studentData = { ...req.body };
    if (req.file) studentData.photo = { data: req.file.buffer, contentType: req.file.mimetype };
    const s = new Student(studentData);
    await s.save();
    const obj = s.toObject();
    delete obj.photo; // don't send binary back
    res.json({ ...obj, hasPhoto: !!req.file });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/students/:id", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.photo = { data: req.file.buffer, contentType: req.file.mimetype };
    const s = await Student.findByIdAndUpdate(req.params.id, update, { new: true }).select("-photo.data");
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/students/:id", requireAuth, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve photo from MongoDB (replaces the old /uploads/ static folder)
app.get("/api/students/:id/photo", async (req, res) => {
  try {
    const s = await Student.findById(req.params.id).select("photo");
    if (!s?.photo?.data) return res.status(404).send("No photo");
    res.set("Content-Type", s.photo.contentType);
    res.send(s.photo.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Health check (Render pings this) ────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Serve frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

// ─── Connect to MongoDB then start ───────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.error("❌  MONGO_URI is not set in environment variables.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`✅  Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });
