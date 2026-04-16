# Orphan Management System

A Node.js + MongoDB web app for managing orphan student records.

---

## 🚀 Deploy to Render + MongoDB Atlas

### 1. MongoDB Atlas Setup
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) → create free cluster
2. Add a database user (username + password)
3. Whitelist `0.0.0.0/0` under Network Access (allows Render to connect)
4. Copy your connection string:  
   `mongodb+srv://<user>:<password>@cluster.mongodb.net/orphan-db`

### 2. GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/orphan-management.git
git push -u origin main
```

### 3. Render
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set these **Environment Variables** in Render dashboard:

| Key              | Value                              |
|------------------|------------------------------------|
| `MONGO_URI`      | your MongoDB Atlas connection string |
| `ADMIN_USERNAME` | e.g. `admin`                       |
| `ADMIN_PASSWORD` | a strong password                  |
| `JWT_SECRET`     | any random long string             |

4. Build command: `npm install`  
5. Start command: `node server.js`

---

## 🔑 Login
Use the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in environment variables.

## 📁 File Storage
Photos are stored directly in MongoDB (no disk needed) — works on Render's free tier.

## API Endpoints

| Method | Path                        | Auth | Description          |
|--------|-----------------------------|------|----------------------|
| POST   | /api/login                  | ❌   | Login → returns token |
| GET    | /api/auth/check             | ✅   | Verify token          |
| GET    | /api/students               | ✅   | List all students     |
| POST   | /api/students               | ✅   | Add student + photo   |
| PUT    | /api/students/:id           | ✅   | Update student        |
| DELETE | /api/students/:id           | ✅   | Delete student        |
| GET    | /api/students/:id/photo     | ❌   | Get student photo     |
| GET    | /health                     | ❌   | Health check          |
