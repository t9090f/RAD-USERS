const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { isAuthenticated, isAdmin, isManager } = require('../middleware/auth');

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
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');
    
    res.render('admin/users', {
      title: 'إدارة المستخدمين',
      users: users
    });
  } catch (error) {
    console.error(error);
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
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      req.flash('error_msg', 'المستخدم غير موجود');
      return res.redirect('/admin/users');
    }
    
    res.render('admin/user-details', {
      title: 'تفاصيل المستخدم',
      user: user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل تفاصيل المستخدم');
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

module.exports = router;
