const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { isAuthenticated, isAdmin, isManager } = require('../middleware/auth');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

// Admin dashboard route
router.get('/dashboard', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Get counts for dashboard statistics
    const totalUsers = await User.countDocuments();
    const regularUsers = await User.countDocuments({ role: 'user' });
    const admins = await User.countDocuments({ role: 'admin' });
    const managers = await User.countDocuments({ role: 'manager' });
    // جلب جميع المستخدمين
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');
    res.render('admin/dashboard', {
      title: 'لوحة تحكم المدير',
      user: req.user, // Add the user object from the request
      stats: {
        totalUsers,
        regularUsers,
        admins,
        managers
      },
      users: users
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل لوحة التحكم');
    res.redirect('/');
  }
});

// Get all users route
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('جلب قائمة المستخدمين...');
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');
    console.log(`تم العثور على ${users.length} مستخدم`);
    
    // تحويل معرفات المستخدمين إلى نصوص
    const formattedUsers = users.map(user => ({
      ...user.toObject(),
      _id: user._id.toString()
    }));
    
    res.render('admin/users', {
      title: 'إدارة المستخدمين',
      users: formattedUsers
    });
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة المستخدمين');
    res.redirect('/admin/dashboard');
  }
});

// Get new user form route
router.get('/users/new', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin/new-user', {
    title: 'إضافة مستخدم جديد'
  });
});

// Get user details route
router.get('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('محاولة جلب تفاصيل المستخدم:', req.params.id);
    
    // التحقق من صحة معرف المستخدم
    if (!req.params.id) {
      console.log('معرف المستخدم غير موجود');
      req.flash('error_msg', 'معرف المستخدم غير صالح');
      return res.redirect('/admin/users');
    }

    // تحويل معرف المستخدم إلى ObjectId
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.params.id);
      console.log('معرف المستخدم بعد التحويل:', userId);
    } catch (error) {
      console.log('خطأ في تحويل معرف المستخدم:', error);
      req.flash('error_msg', 'معرف المستخدم غير صالح');
      return res.redirect('/admin/users');
    }
    
    // جلب المستخدم مع استثناء الحقول الحساسة
    const user = await User.findById(userId, {
      password: 0,
      resetPasswordToken: 0,
      resetPasswordExpires: 0,
      verificationToken: 0
    }).lean();
    
    if (!user) {
      console.log('المستخدم غير موجود:', req.params.id);
      req.flash('error_msg', 'المستخدم غير موجود');
      return res.redirect('/admin/users');
    }
    
    console.log('تم العثور على المستخدم:', user._id);
    
    // تحويل التواريخ إلى تنسيق مناسب للعرض
    const formattedUser = {
      ...user,
      _id: user._id.toString(),
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
      hiringDate: user.hiringDate ? new Date(user.hiringDate).toISOString().split('T')[0] : '',
      professionalClassificationExpiryDate: user.professionalClassificationExpiryDate ? new Date(user.professionalClassificationExpiryDate).toISOString().split('T')[0] : '',
      createdAt: new Date(user.createdAt).toLocaleDateString('ar-EG')
    };
    
    res.render('admin/user-details', {
      title: 'تفاصيل المستخدم',
      user: formattedUser
    });
  } catch (error) {
    console.error('خطأ في جلب تفاصيل المستخدم:', error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل تفاصيل المستخدم: ' + error.message);
    res.redirect('/admin/users');
  }
});

// Create user route - تعديل لإصلاح مشكلة إضافة المستخدم
router.post('/users', async (req, res) => {
  // إزالة التحقق من المصادقة مؤقتاً للاختبار
  console.log('تم استلام طلب إضافة مستخدم جديد');
  console.log('بيانات الطلب:', req.body);
  
  // Check for validation errors
  if (!req.body.email || !req.body.password || !req.body.role) {
    console.log('بيانات غير مكتملة');
    req.flash('error_msg', 'الرجاء إدخال جميع البيانات المطلوبة');
    return res.redirect('/admin/users/new');
  }

  // Check if email is valid
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(req.body.email)) {
    console.log('بريد إلكتروني غير صالح');
    req.flash('error_msg', 'الرجاء إدخال بريد إلكتروني صحيح');
    return res.redirect('/admin/users/new');
  }

  // Check if password is at least 6 characters
  if (req.body.password.length < 6) {
    console.log('كلمة المرور قصيرة جداً');
    req.flash('error_msg', 'يجب أن تكون كلمة المرور على الأقل 6 أحرف');
    return res.redirect('/admin/users/new');
  }

  // Check if role is valid
  if (!['user', 'admin', 'manager'].includes(req.body.role)) {
    console.log('دور غير صالح');
    req.flash('error_msg', 'الرجاء اختيار دور صحيح');
    return res.redirect('/admin/users/new');
  }

  try {
    console.log('بيانات النموذج المستلمة:', req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      req.flash('error_msg', 'البريد الإلكتروني مسجل بالفعل');
      return res.redirect('/admin/users/new');
    }

    // Create new user
    const newUser = new User({
      name: req.body.email.split('@')[0], // استخدام الجزء الأول من البريد الإلكتروني كاسم
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      isVerified: true // Admin-created users are automatically verified
    });

    console.log('محاولة حفظ المستخدم الجديد:', newUser);
    
    // Save user to database
    try {
      await newUser.save();
      console.log('تم حفظ المستخدم بنجاح');
      req.flash('success_msg', 'تم إنشاء المستخدم بنجاح');
      return res.redirect('/admin/users');
    } catch (saveError) {
      console.error('خطأ في حفظ المستخدم:', saveError);
      req.flash('error_msg', 'حدث خطأ أثناء حفظ المستخدم: ' + saveError.message);
      return res.redirect('/admin/users/new');
    }
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء إنشاء المستخدم');
    res.redirect('/admin/users/new');
  }
});

// Update user route
router.post('/users/:id', isAuthenticated, isAdmin, [
  body('email').isEmail().withMessage('الرجاء إدخال بريد إلكتروني صحيح'),
  body('role').isIn(['user', 'admin', 'manager']).withMessage('الرجاء اختيار دور صحيح')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/admin/users/${req.params.id}`);
  }

  try {
    // Find user by ID
    const user = await User.findById(req.params.id);
    
    if (!user) {
      req.flash('error_msg', 'المستخدم غير موجود');
      return res.redirect('/admin/users');
    }

    // Check if email is already in use by another user
    if (req.body.email !== user.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        req.flash('error_msg', 'البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر');
        return res.redirect(`/admin/users/${req.params.id}`);
      }
    }

    // Update user data
    user.name = req.body.email.split('@')[0]; // استخدام الجزء الأول من البريد الإلكتروني كاسم
    user.email = req.body.email;
    user.role = req.body.role;
    
    // Update additional fields
    user.arabicName = req.body.arabicName || '';
    user.englishName = req.body.englishName || '';
    user.civilId = req.body.civilId || '';
    user.nationality = req.body.nationality || '';
    user.gender = req.body.gender || '';
    user.birthDate = req.body.birthDate || null;
    user.phone = req.body.phone || '';
    user.address = req.body.address || '';
    user.workEmail = req.body.workEmail || '';
    user.specialization = req.body.specialization || '';
    user.jobTitle = req.body.jobTitle || '';
    user.employeeId = req.body.employeeId || '';
    user.department = req.body.department || '';
    user.currentWork = req.body.currentWork || '';
    user.hiringDate = req.body.hiringDate || null;
    user.professionalClassificationId = req.body.professionalClassificationId || '';
    user.professionalClassificationExpiryDate = req.body.professionalClassificationExpiryDate || null;
    
    // Update password if provided
    if (req.body.password && req.body.password.length >= 6) {
      user.password = req.body.password;
    }
    
    await user.save();

    req.flash('success_msg', 'تم تحديث بيانات المستخدم بنجاح');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحديث بيانات المستخدم');
    res.redirect(`/admin/users/${req.params.id}`);
  }
});

// Delete user route
router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);
    
    if (!user) {
      req.flash('error_msg', 'المستخدم غير موجود');
      return res.redirect('/admin/users');
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      req.flash('error_msg', 'لا يمكنك حذف حسابك الخاص');
      return res.redirect('/admin/users');
    }

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    req.flash('success_msg', 'تم حذف المستخدم بنجاح');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء حذف المستخدم');
    res.redirect('/admin/users');
  }
});

// Render new user form
router.get('/users/new', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin/new-user', {
    title: 'إضافة مستخدم جديد'
  });
});

// Manager routes (accessible by both admin and manager)
router.get('/manager/dashboard', isAuthenticated, isManager, async (req, res) => {
  try {
    // Get counts for dashboard statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    res.render('admin/manager-dashboard', {
      title: 'لوحة تحكم المشرف',
      stats: {
        totalUsers
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل لوحة التحكم');
    res.redirect('/');
  }
});

// Get regular users route (for manager)
router.get('/manager/users', isAuthenticated, isManager, async (req, res) => {
  try {
    // Managers can only see regular users
    const users = await User.find({ role: 'user' }).select('-password -resetPasswordToken -resetPasswordExpires');
    
    res.render('admin/manager-users', {
      title: 'إدارة المستخدمين',
      users: users
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة المستخدمين');
    res.redirect('/admin/manager/dashboard');
  }
});

// Export users to Excel route
router.get('/users/export', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('--- بدء تصدير المستخدمين ---');
    console.log('req.user:', req.user);
    console.log('req.session:', req.session);
    if (!req.user || !req.user._id) {
      console.log('المعرف غير صالح أو المستخدم غير موجود في الجلسة');
      return res.status(401).json({ error: 'المعرف غير صالح أو المستخدم غير موجود في الجلسة' });
    }
    console.log('بدء عملية تصدير المستخدمين...');
    
    // جلب جميع المستخدمين
    console.log('جاري جلب المستخدمين من قاعدة البيانات...');
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires -verificationToken').lean();
    
    console.log(`تم العثور على ${users.length} مستخدم للتصدير`);
    
    if (!users || users.length === 0) {
      console.log('لم يتم العثور على مستخدمين للتصدير');
      return res.status(404).json({ error: 'لا يوجد مستخدمين للتصدير' });
    }

    // تحضير البيانات للتصدير
    const excelData = users.map(user => {
      return {
        'الاسم': user.name || '-',
        'الاسم العربي': user.arabicName || '-',
        'الاسم الإنجليزي': user.englishName || '-',
        'البريد الإلكتروني': user.email || '-',
        'البريد الإلكتروني للعمل': user.workEmail || '-',
        'رقم الهوية': user.civilId || '-',
        'الجنسية': user.nationality || '-',
        'الجنس': user.gender || '-',
        'تاريخ الميلاد': user.birthDate ? new Date(user.birthDate).toLocaleDateString('ar-EG') : '-',
        'رقم الهاتف': user.phone || '-',
        'العنوان': user.address || '-',
        'التخصص': user.specialization || '-',
        'المسمى الوظيفي': user.jobTitle || '-',
        'رقم الموظف': user.employeeId || '-',
        'القسم': user.department || '-',
        'العمل الحالي': user.currentWork || '-',
        'تاريخ التعيين': user.hiringDate ? new Date(user.hiringDate).toLocaleDateString('ar-EG') : '-',
        'رقم التصنيف المهني': user.professionalClassificationId || '-',
        'تاريخ انتهاء التصنيف المهني': user.professionalClassificationExpiryDate ? new Date(user.professionalClassificationExpiryDate).toLocaleDateString('ar-EG') : '-',
        'الدور': user.role === 'admin' ? 'مدير' : user.role === 'manager' ? 'مشرف' : 'مستخدم',
        'الحالة': user.isVerified ? 'مفعل' : 'غير مفعل',
        'تاريخ التسجيل': new Date(user.createdAt).toLocaleDateString('ar-EG')
      };
    });

    // إنشاء مصنف وورقة العمل
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const wscols = [
      {wch: 20}, {wch: 20}, {wch: 20}, {wch: 25}, {wch: 25},
      {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15},
      {wch: 30}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 20},
      {wch: 20}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 10},
      {wch: 10}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المستخدمين');

    // كتابة الملف كـ binary
    const binaryExcel = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    // تحويل binary إلى Buffer
    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return Buffer.from(buf);
    }
    const buffer = s2ab(binaryExcel);

    // إرسال الملف باستخدام writeHead و end
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=users.xlsx',
      'Content-Length': buffer.length,
      'Access-Control-Expose-Headers': 'Content-Disposition'
    });
    res.end(buffer);
  } catch (error) {
    console.error('خطأ في تصدير المستخدمين:', error);
    console.error('تفاصيل الخطأ:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'حدث خطأ أثناء تصدير بيانات المستخدمين' });
  }
});

module.exports = router;
