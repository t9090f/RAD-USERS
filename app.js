const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const csurf = require('csurf');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// التعامل مع عنوان الموقع
const getBaseUrl = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

// إضافة middleware لتعيين BASE_URL
app.use((req, res, next) => {
  process.env.BASE_URL = getBaseUrl(req);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// إضافة رؤوس الأمان المخصصة
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http://localhost:3000; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://code.jquery.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com data:; " +
    "img-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com blob: http://localhost:3000; " +
    "connect-src 'self' blob: http://localhost:3000; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'self'; " +
    "worker-src 'self' blob:; " +
    "child-src 'self' blob:;"
  );
  next();
});

// Set up session with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'سر_الجلسة_الافتراضي',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 24 hours
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: false
  }
}));

// Set up flash messages
app.use(flash());

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());
app.use(express.static('public', { maxAge: '7d' }));

// مسار خاص لـ favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'img', 'favicon.ico'));
});

// مسار وسيط للتعامل مع طلبات الصور من المسار القديم
app.get('/uploads/users/:userId/:filename', (req, res) => {
  console.log('تم طلب ملف من المسار القديم:', req.params.filename);
  // إعادة توجيه الطلب إلى المسار الجديد للصور في قاعدة البيانات
  res.redirect(`/files/image/${req.params.filename}`);
});

// مسار وسيط للتعامل مع طلبات الصور من المسار القديم البديل
app.get('/uploads/:filename', (req, res) => {
  console.log('تم طلب ملف من المسار القديم البديل:', req.params.filename);
  // إعادة توجيه الطلب إلى المسار الجديد للصور في قاعدة البيانات
  res.redirect(`/files/image/${req.params.filename}`);
});

// منع الوصول المباشر إلى مجلد uploads لأن جميع الملفات مخزنة في قاعدة البيانات
app.use('/uploads', (req, res) => {
  console.log('محاولة وصول مباشرة إلى مجلد uploads:', req.url);
  res.status(404).send('الملفات مخزنة في قاعدة البيانات وليس في نظام الملفات المحلي');
});

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const filesRoutes = require('./routes/files');

// تسجيل المسارات
console.log('جاري تسجيل مسارات المصادقة...');
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// ميدلوير CSRF وحقن التوكن فقط لصفحات النماذج
app.get('/auth/login', csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.get('/auth/register', csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.get('/auth/forgot-password', csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.get('/auth/reset-password/:token', csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
// ميدلوير CSRF فقط لطلبات POST على /auth
app.post('/auth/*', csrfProtection);

// ميدلوير CSRF وحقن التوكن لصفحات النماذج في admin
app.get('/admin/users/new', csrfProtection, (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
// ميدلوير CSRF فقط لطلبات POST على /admin
app.post('/admin/*', csrfProtection);

app.use('/auth', authRoutes);
console.log('تم تسجيل مسارات المصادقة');

console.log('جاري تسجيل مسارات المستخدمين...');
app.use('/users', userRoutes);
console.log('تم تسجيل مسارات المستخدمين');

console.log('جاري تسجيل مسارات الإدارة...');
app.use('/admin', adminRoutes);
console.log('تم تسجيل مسارات الإدارة');

console.log('جاري تسجيل مسارات الملفات...');
app.use('/files', filesRoutes);
console.log('تم تسجيل مسارات الملفات');

// مسار التحقق من البريد الإلكتروني
app.get('/auth/verify/:token', (req, res) => {
  console.log('تم استلام طلب تحقق من البريد الإلكتروني');
  console.log('رمز التحقق:', req.params.token);
  console.log('BASE_URL:', process.env.BASE_URL);
  console.log('الطلب من:', req.headers.host);
  console.log('البروتوكول:', req.protocol);
  
  // إعادة توجيه إلى صفحة التحقق مع إضافة المزيد من المعلومات
  res.redirect(`/auth/verify-email?token=${req.params.token}`);
});

// Home route
app.get('/', (req, res) => {
  if (req.session && req.session.passport && req.session.passport.user) {
    // المستخدم مسجل دخوله
    const user = req.user || res.locals.user;
    if (user) {
      if (user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      } else if (user.role === 'manager') {
        return res.redirect('/admin/manager/dashboard');
      } else {
        return res.redirect('/users/dashboard');
      }
    }
  }
  res.render('index', { title: 'نظام إدارة المستخدمين' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`تم تشغيل الخادم على المنفذ ${PORT}`);
});

module.exports = app;
