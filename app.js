const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000 // زيادة مهلة الاتصال إلى 30 ثانية
})
  .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// Middleware
app.use(cors({
  origin: '*', // تعديل هذا ليتناسب مع نطاق Render.com
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET || 'سر_الجلسة_الافتراضي',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'none', // تعديل هذا للنشر
    secure: true // تعديل هذا للنشر
  }
}));

// Set up flash messages
app.use(flash());

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/files', filesRoutes);

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
