const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { isAuthenticated, isUser } = require('../middleware/auth');

// إعداد multer لتخزين الملفات مؤقتًا في الذاكرة
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB كحد أقصى لحجم الملف
  fileFilter: (req, file, cb) => {
    // قبول جميع أنواع الملفات
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    // التحقق من امتداد الملف
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      console.log('تم قبول الملف:', file.originalname, 'MIME:', file.mimetype);
      cb(null, true);
    } else {
      console.log('تم رفض الملف:', file.originalname, 'MIME:', file.mimetype);
      cb(null, false);
    }
  }
});

// تم نقل إعدادات تخزين الملفات إلى ملف config/gridfs.js

// User dashboard route
router.get('/dashboard', isAuthenticated, isUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.render('users/dashboard', {
      title: 'لوحة التحكم',
      user: user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل لوحة التحكم');
    res.redirect('/');
  }
});

// User profile route
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.render('users/profile', {
      title: 'الملف الشخصي',
      user: user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل الملف الشخصي');
    res.redirect('/users/dashboard');
  }
});

// Update profile route
router.post('/profile', isAuthenticated, [
  body('phone').optional(),
  body('address').optional(),
  body('arabicName').optional(),
  body('englishName').optional(),
  body('civilId').optional(),
  body('nationality').optional(),
  body('gender').optional(),
  body('birthDate').optional(),
  body('workEmail').optional(),
  body('specialization').optional(),
  body('jobTitle').optional(),
  body('employeeId').optional(),
  body('department').optional(),
  body('currentWork').optional(),
  body('hiringDate').optional(),
  body('professionalClassificationId').optional(),
  body('professionalClassificationExpiryDate').optional()
], express.urlencoded({ extended: true }), upload.single('profileImage'), async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/users/profile');
  }

  try {
    console.log('بيانات النموذج المستلمة:', req.body);
    
    // التحقق من وجود معرف المستخدم
    if (!req.user || !req.user.id) {
      console.error('معرف المستخدم غير موجود في الجلسة');
      req.flash('error_msg', 'يرجى تسجيل الدخول مرة أخرى');
      return res.redirect('/login');
    }
    
    // البحث عن المستخدم في قاعدة البيانات
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error('لم يتم العثور على المستخدم بالمعرف:', req.user.id);
      req.flash('error_msg', 'لم يتم العثور على المستخدم');
      return res.redirect('/users/profile');
    }
    
    // تحديث بيانات المستخدم - مع التعامل مع القيم الفارغة بشكل صحيح
    // الاسم يبقى كما هو (مشتق من البريد الإلكتروني)
    console.log('تحديث بيانات المستخدم...');
    
    // تحديث البيانات بشكل مباشر بدلاً من الشروط
    user.arabicName = req.body.arabicName || user.arabicName;
    user.englishName = req.body.englishName || user.englishName;
    user.civilId = req.body.civilId || user.civilId;
    user.nationality = req.body.nationality || user.nationality;
    user.gender = req.body.gender || user.gender;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    user.workEmail = req.body.workEmail || user.workEmail;
    user.specialization = req.body.specialization || user.specialization;
    user.jobTitle = req.body.jobTitle || user.jobTitle;
    user.employeeId = req.body.employeeId || user.employeeId;
    user.department = req.body.department || user.department;
    user.currentWork = req.body.currentWork || user.currentWork;
    user.professionalClassificationId = req.body.professionalClassificationId || user.professionalClassificationId;
    
    // معالجة خاصة للتواريخ
    if (req.body.birthDate) {
      user.birthDate = new Date(req.body.birthDate);
    }
    
    if (req.body.hiringDate) {
      user.hiringDate = new Date(req.body.hiringDate);
    }
    
    if (req.body.professionalClassificationExpiryDate) {
      user.professionalClassificationExpiryDate = new Date(req.body.professionalClassificationExpiryDate);
    }
    
    console.log('تم تحديث البيانات في الذاكرة، جاهز للحفظ في قاعدة البيانات');
    
    // طباعة البيانات قبل الحفظ للتحقق
    console.log('البيانات التي سيتم حفظها:', {
      arabicName: user.arabicName,
      englishName: user.englishName,
      civilId: user.civilId,
      nationality: user.nationality,
      gender: user.gender,
      birthDate: user.birthDate,
      phone: user.phone,
      address: user.address,
      workEmail: user.workEmail,
      specialization: user.specialization,
      jobTitle: user.jobTitle,
      employeeId: user.employeeId,
      department: user.department,
      currentWork: user.currentWork,
      hiringDate: user.hiringDate,
      professionalClassificationId: user.professionalClassificationId,
      professionalClassificationExpiryDate: user.professionalClassificationExpiryDate
    });
    
    // تحديث الصورة الشخصية إذا تم رفعها
    if (req.file) {
      try {
        // تخزين الصورة كبيانات Base64 مباشرة في قاعدة البيانات
        const imageData = req.file.buffer.toString('base64');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(req.file.originalname);
        
        // تخزين البيانات في وثيقة المستخدم
        user.profileImage = filename;
        user.profileImageData = imageData;
        user.profileImageMimeType = req.file.mimetype;
        
        console.log('تم تخزين الصورة في قاعدة البيانات كبيانات Base64');
      } catch (err) {
        console.error('خطأ في تخزين الصورة:', err);
      }
    }
    
    // حفظ البيانات في قاعدة البيانات
    try {
      console.log('محاولة حفظ بيانات المستخدم في MongoDB...');
      console.log('معرف المستخدم قبل الحفظ:', user._id);
      console.log('حالة المستخدم قبل الحفظ:', user.isNew ? 'جديد' : 'موجود');
      console.log('البيانات المعدلة:', user.modifiedPaths());
      
      const savedUser = await user.save();
      
      console.log('تم حفظ بيانات المستخدم بنجاح:', savedUser._id);
      console.log('البيانات المحفوظة:', {
        arabicName: savedUser.arabicName,
        englishName: savedUser.englishName,
        phone: savedUser.phone,
        // المزيد من البيانات للتحقق
      });
      
      req.flash('success_msg', 'تم تحديث الملف الشخصي بنجاح');
    } catch (saveError) {
      console.error('خطأ في حفظ بيانات المستخدم:', saveError);
      console.error('تفاصيل الخطأ:', saveError.stack);
      req.flash('error_msg', 'حدث خطأ أثناء حفظ البيانات: ' + saveError.message);
    }
    
    res.redirect('/users/profile');
  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    req.flash('error_msg', 'حدث خطأ أثناء تحديث الملف الشخصي: ' + error.message);
    res.redirect('/users/profile');
  }
});

// Change password route
router.post('/change-password', isAuthenticated, [
  body('currentPassword').notEmpty().withMessage('الرجاء إدخال كلمة المرور الحالية'),
  body('newPassword').isLength({ min: 6 }).withMessage('يجب أن تكون كلمة المرور الجديدة على الأقل 6 أحرف'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('كلمات المرور غير متطابقة');
    }
    return true;
  })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/users/profile');
  }

  try {
    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      req.flash('error_msg', 'كلمة المرور الحالية غير صحيحة');
      return res.redirect('/users/profile');
    }
    
    // Update password
    user.password = req.body.newPassword;
    await user.save();
    
    req.flash('success_msg', 'تم تغيير كلمة المرور بنجاح');
    res.redirect('/users/profile');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تغيير كلمة المرور');
    res.redirect('/users/profile');
  }
});

// Upload file route - تخزين الملفات كـ Base64 في قاعدة البيانات
router.post('/upload-file', isAuthenticated, upload.single('file'), async (req, res) => {
  if (!req.file) {
    req.flash('error_msg', 'الرجاء اختيار ملف للتحميل');
    return res.redirect('/users/dashboard');
  }

  try {
    // طباعة بيانات النموذج للتشخيص
    console.log('بيانات النموذج المستلمة:', req.body);
    console.log('اسم الملف المخصص المستلم:', req.body.displayName);
    console.log('معلومات الملف:', req.file.originalname, req.file.mimetype, req.file.size);
    
    const user = await User.findById(req.user.id);
    
    // التأكد من أن الملف موجود وله بيانات
    if (!req.file.buffer) {
      console.error('لا يوجد بيانات للملف');
      req.flash('error_msg', 'حدث خطأ أثناء تحميل الملف');
      return res.redirect('/users/dashboard');
    }
    
    // تحويل الملف إلى بيانات Base64
    const fileData = req.file.buffer.toString('base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // التعامل مع التسمية المخصصة للملف
    let filename = uniqueSuffix + path.extname(req.file.originalname);
    
    // التحقق من وجود تسمية مخصصة
    let customName = '';
    if (req.body.displayName && req.body.displayName.trim() !== '') {
      customName = req.body.displayName.trim();
      // إزالة أي أحرف غير مسموح بها في اسم الملف
      customName = customName.replace(/[\\/:*?"<>|]/g, '_');
      console.log('التسمية المخصصة بعد التنظيف:', customName);
    } else {
      customName = '';
      console.log('لا توجد تسمية مخصصة');
    }
    
    // التأكد من نوع الملف بناءً على الامتداد
    let mimetype = req.file.mimetype;
    const ext = path.extname(req.file.originalname).toLowerCase().substring(1);
    if (ext === 'jpg' || ext === 'jpeg') mimetype = 'image/jpeg';
    else if (ext === 'png') mimetype = 'image/png';
    else if (ext === 'gif') mimetype = 'image/gif';
    else if (ext === 'pdf') mimetype = 'application/pdf';
    else if (ext === 'txt') mimetype = 'text/plain';
    else if (ext === 'doc' || ext === 'docx') mimetype = 'application/msword';
    else if (ext === 'xls' || ext === 'xlsx') mimetype = 'application/vnd.ms-excel';
    
    // إضافة الملف إلى مصفوفة ملفات المستخدم
    const newFile = {
      filename: filename,
      originalname: req.file.originalname,
      displayName: customName, // استخدام الاسم المخصص الجديد
      path: '/files/view/', // سيتم إضافة معرف الملف لاحقًا
      mimetype: mimetype,
      size: req.file.size,
      fileData: fileData, // تخزين بيانات الملف كبيانات Base64
      uploadDate: new Date()
    };
    
    console.log('بيانات الملف الجديد:', {
      filename: newFile.filename,
      originalname: newFile.originalname,
      displayName: newFile.displayName,
      mimetype: newFile.mimetype,
      size: newFile.size
    });
    
    user.files.push(newFile);
    
    await user.save();
    console.log('تم تخزين الملف بنجاح في قاعدة البيانات:', filename);
    
    req.flash('success_msg', 'تم تحميل الملف بنجاح');
    res.redirect('/users/dashboard');
  } catch (error) {
    console.error('خطأ في تحميل الملف:', error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل الملف');
    res.redirect('/users/dashboard');
  }
});

// Delete file route - حذف الملفات من قاعدة البيانات
router.post('/delete-file/:fileId', isAuthenticated, async (req, res) => {
  try {
    console.log('طلب حذف الملف:', req.params.fileId);
    
    // البحث عن المستخدم باستخدام معرف الملف أولاً
    let user = await User.findOne({ 'files._id': req.params.fileId });
    
    // إذا لم يتم العثور على المستخدم بهذه الطريقة، ابحث باستخدام معرف المستخدم
    if (!user) {
      user = await User.findById(req.user.id);
      console.log('تم البحث عن المستخدم باستخدام معرف المستخدم:', req.user.id);
    } else {
      console.log('تم العثور على المستخدم باستخدام معرف الملف');
    }
    
    if (!user) {
      console.log('لم يتم العثور على المستخدم');
      req.flash('error_msg', 'لم يتم العثور على المستخدم');
      return res.redirect('/users/dashboard');
    }
    
    // البحث عن الملف في مصفوفة ملفات المستخدم
    const fileIndex = user.files.findIndex(file => file._id.toString() === req.params.fileId);
    
    if (fileIndex === -1) {
      console.log('لم يتم العثور على الملف في مصفوفة ملفات المستخدم');
      req.flash('error_msg', 'لم يتم العثور على الملف');
      return res.redirect('/users/dashboard');
    }
    
    // الحصول على معلومات الملف قبل حذفه من المصفوفة
    const fileInfo = user.files[fileIndex];
    console.log('الملف المراد حذفه:', fileInfo.filename);
    
    // حذف الملف من مصفوفة ملفات المستخدم
    user.files.splice(fileIndex, 1);
    await user.save();
    
    console.log('تم حذف الملف بنجاح من قاعدة البيانات');
    req.flash('success_msg', 'تم حذف الملف بنجاح');
    res.redirect('/users/dashboard');
  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    req.flash('error_msg', 'حدث خطأ أثناء حذف الملف');
    res.redirect('/users/dashboard');
  }
});

module.exports = router;
