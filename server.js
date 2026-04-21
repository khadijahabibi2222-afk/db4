require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB ────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orphan_db')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Schemas ────────────────────────────────────────────
const DataStoreSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});
const DataStore = mongoose.model('DataStore', DataStoreSchema);

// ─── Auth Middleware ─────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'توکن موجود نیست' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'oms_secret_key_2024');
    next();
  } catch {
    res.status(401).json({ error: 'توکن نامعتبر است' });
  }
}

// ─── Default Users ────────────────────────────────────────
const DEFAULT_USERS = [
  { id: 'u1', username: 'admin',  password: 'admin123', fullName: 'System Administrator', role: 'admin'  },
  { id: 'u2', username: 'editor', password: 'edit123',  fullName: 'Data Editor',           role: 'editor' },
  { id: 'u3', username: 'viewer', password: 'view123',  fullName: 'Read-Only Viewer',       role: 'viewer' },
];

// ─── Seed ─────────────────────────────────────────────────
async function seedDefaults() {
  const exists = await DataStore.findOne({ key: 'oms_users' });
  if (!exists) {
    await DataStore.create({ key: 'oms_users', value: DEFAULT_USERS });
    console.log('✅ Default users seeded');
  }
}

// ─── Routes ───────────────────────────────────────────────

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });

    const doc   = await DataStore.findOne({ key: 'oms_users' });
    const users = doc?.value || DEFAULT_USERS;
    const user  = users.find(u => u.username === username && u.password === password);

    if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'oms_secret_key_2024',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// GET all data for current user
app.get('/api/sync', auth, async (req, res) => {
  try {
    const docs   = await DataStore.find({});
    const result = {};
    docs.forEach(d => { result[d.key] = d.value; });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در بارگذاری داده‌ها' });
  }
});

// POST save one key
app.post('/api/sync', auth, async (req, res) => {
  try {
    const { key, data } = req.body;
    if (!key) return res.status(400).json({ error: 'کلید الزامی است' });

    await DataStore.findOneAndUpdate(
      { key },
      { value: data, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ذخیره داده' });
  }
});

// Bulk save (export/import)
app.post('/api/sync/bulk', auth, async (req, res) => {
  try {
    const { entries } = req.body; // [{key, data}]
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'فرمت نادرست' });
    const ops = entries.map(({ key, data }) => ({
      updateOne: {
        filter: { key },
        update: { $set: { value: data, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await DataStore.bulkWrite(ops);
    res.json({ ok: true, count: entries.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ذخیره دسته‌ای' });
  }
});

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// SPA fallback
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
mongoose.connection.once('open', async () => {
  await seedDefaults();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
