# 🕌 سیستم مدیریت یتیمان — موسسه خیریه رفاه یتیم

یک وب اپلیکیشن کامل برای مدیریت یتیمان، کفلا، ثبت نمرات، کتابخانه و گزارش‌گیری.

---

## 🗂️ ساختار پروژه

```
orphan-app/
├── server.js          ← Express + MongoDB backend
├── package.json
├── .env.example       ← نمونه متغیرهای محیطی
├── .gitignore
└── public/
    └── index.html     ← کل فرانت‌اند (Single Page App)
```

---

## 🚀 مراحل راه‌اندازی آنلاین

### مرحله ۱ — MongoDB Atlas (دیتابیس رایگان)

1. به [mongodb.com/atlas](https://www.mongodb.com/atlas) بروید
2. **Create a free account** → **Create Free Cluster** (M0 رایگان است)
3. در **Database Access**: یک کاربر با رمز عبور بسازید
4. در **Network Access**: `0.0.0.0/0` را اضافه کنید (اجازه دسترسی از همه‌جا)
5. روی **Connect** کلیک کنید → **Drivers** → Connection String را کپی کنید:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/orphan_db?retryWrites=true&w=majority
   ```

---

### مرحله ۲ — GitHub (آپلود کد)

```bash
# در پوشه orphan-app:
git init
git add .
git commit -m "Initial commit — Orphan Management System"

# یک repository جدید در github.com بسازید، سپس:
git remote add origin https://github.com/YOUR_USERNAME/orphan-app.git
git branch -M main
git push -u origin main
```

---

### مرحله ۳ — Render (هاستینگ رایگان)

1. به [render.com](https://render.com) بروید و با GitHub وارد شوید
2. **New → Web Service**
3. Repository خود را انتخاب کنید
4. تنظیمات:
   | فیلد | مقدار |
   |------|-------|
   | **Name** | orphan-management-system |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
5. در بخش **Environment Variables** این دو را اضافه کنید:
   ```
   MONGODB_URI  =  mongodb+srv://...  (از مرحله ۱)
   JWT_SECRET   =  OrphanApp_Secret_2024_!@#
   ```
6. **Create Web Service** → صبر کنید تا Deploy شود (~2 دقیقه)
7. آدرس شما: `https://orphan-management-system.onrender.com`

---

## 🔑 اطلاعات ورود پیش‌فرض

| نقش | نام کاربری | رمز عبور |
|-----|-----------|---------|
| مدیر کل | `admin` | `admin123` |
| ویرایشگر | `editor` | `edit123` |
| مشاهده‌گر | `viewer` | `view123` |

⚠️ **پس از اولین ورود، رمزها را تغییر دهید!**

---

## 🔄 نحوه عملکرد سینک داده

```
[مرورگر] ──login──► [Render / Express] ──auth──► [MongoDB Atlas]
                          │
                     JWT Token صادر می‌شود
                          │
[مرورگر] ──save data──► [API /api/sync] ──► [MongoDB]
[مرورگر] ◄──load data── [API /api/sync] ◄── [MongoDB]
```

- هنگام **لاگین**: داده‌ها از MongoDB بارگذاری می‌شوند
- هنگام **ذخیره**: هم localStorage هم MongoDB آپدیت می‌شوند
- اگر اینترنت قطع باشد: **Offline mode** — فقط localStorage کار می‌کند

---

## 🛠️ اجرای محلی (برای تست)

```bash
# نصب
npm install

# ساخت فایل .env
cp .env.example .env
# فایل .env را ویرایش کنید و MONGODB_URI را وارد کنید

# اجرا
npm start
# برنامه روی http://localhost:3000 قابل دسترس است
```

---

## 📋 API Endpoints

| Method | Path | توضیح |
|--------|------|-------|
| POST | `/api/login` | ورود و دریافت JWT token |
| GET | `/api/sync` | دریافت همه داده‌ها |
| POST | `/api/sync` | ذخیره یک کلید |
| POST | `/api/sync/bulk` | ذخیره دسته‌ای |
| GET | `/api/health` | وضعیت سرور |

---

## ⚙️ نکات مهم

- فایل `public/index.html` کل فرانت‌اند است — هر تغییر در UI فقط در همین فایل است
- عکس‌ها در IndexedDB مرورگر ذخیره می‌شوند (base64) و در MongoDB sync نمی‌شوند — برای عکس‌ها می‌توان Cloudinary اضافه کرد
- Render در پلان رایگان بعد از ۱۵ دقیقه خواب می‌رود — اولین request کمی کند است
