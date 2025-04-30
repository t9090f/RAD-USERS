const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../config/mailer');
const { isAuthenticated } = require('../middleware/auth');

// Register route
router.post('/register', [
  // Validation
  body('email').isEmail().withMessage('الرجاء إدخال بريد إلكتروني صحيح'),
  body('password').isLength({ min: 6 }).withMessage('يجب أن تكون كلمة المرور على الأقل 6 أحرف'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('كلمات المرور غير متطابقة');
    }
    return true;
  })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/register');
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      req.flash('error_msg', 'البريد الإلكتروني مسجل بالفعل');
      return res.redirect('/auth/register');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create new user
    const newUser = new User({
      name: req.body.email.split('@')[0], // استخدام جزء من البريد الإلكتروني كاسم افتراضي
      email: req.body.email,
      password: req.body.password,
      verificationToken: verificationToken
    });

    console.log('جاري حفظ المستخدم الجديد:', newUser.email);
    
    // Save user to database
    await newUser.save();
    console.log('تم حفظ المستخدم بنجاح');
    
    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;
    console.log('رابط التحقق:', verificationUrl);
    
    const mailOptions = {
      to: newUser.email,
      subject: 'تأكيد البريد الإلكتروني',
      html: `
        <div dir="rtl" style="font-family: 'Cairo', sans-serif; text-align: right;">
          <h2>مرحباً بك،</h2>
          <p>شكراً لتسجيلك في نظام إدارة المستخدمين.</p>
          <p>الرجاء النقر على الرابط أدناه لتأكيد بريدك الإلكتروني:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">تأكيد البريد الإلكتروني</a>
          <p>إذا لم تقم بالتسجيل، يرجى تجاهل هذا البريد الإلكتروني.</p>
          <p>مع تحيات،<br>فريق نظام إدارة المستخدمين</p>
        </div>
      `
    };
    
    console.log('جاري إرسال بريد التحقق إلى:', newUser.email);
    await sendEmail(mailOptions);
    console.log('تم إرسال بريد التحقق بنجاح');
    
    req.flash('success_msg', 'تم التسجيل بنجاح. الرجاء التحقق من بريدك الإلكتروني لتفعيل حسابك');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء التسجيل');
    res.redirect('/auth/register');
  }
});

// Email verification route
router.get('/verify/:token', async (req, res) => {
  try {
    // Find user with verification token
    const user = await User.findOne({ verificationToken: req.params.token });
    
    if (!user) {
      req.flash('error_msg', 'رمز التحقق غير صالح');
      return res.redirect('/auth/login');
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    req.flash('success_msg', 'تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تأكيد البريد الإلكتروني');
    res.redirect('/auth/login');
  }
});

// Login route
router.post('/login', [
  // Validation
  body('email').isEmail().withMessage('الرجاء إدخال بريد إلكتروني صحيح'),
  body('password').notEmpty().withMessage('الرجاء إدخال كلمة المرور')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }

  try {
    // Find user by email
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      req.flash('error_msg', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      return res.redirect('/auth/login');
    }

    // Check if user is verified
    if (!user.isVerified) {
      req.flash('error_msg', 'الرجاء تأكيد بريدك الإلكتروني قبل تسجيل الدخول');
      return res.redirect('/auth/login');
    }

    // Check password
    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) {
      req.flash('error_msg', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      return res.redirect('/auth/login');
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Redirect based on user role
    if (user.role === 'admin' || user.role === 'manager') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/users/dashboard');
    }
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء تسجيل الدخول');
    res.redirect('/auth/login');
  }
});

// Forgot password route
router.post('/forgot-password', [
  body('email').isEmail().withMessage('الرجاء إدخال بريد إلكتروني صحيح')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/forgot-password');
  }

  try {
    // Find user by email
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      // Don't reveal that the user doesn't exist
      req.flash('success_msg', 'إذا كان البريد الإلكتروني مسجلاً، فستتلقى رسالة لإعادة تعيين كلمة المرور');
      return res.redirect('/auth/forgot-password');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiry on user model
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
    const mailOptions = {
      to: user.email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
        <div dir="rtl" style="font-family: 'Cairo', sans-serif; text-align: right;">
          <h2>مرحباً ${user.name}،</h2>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p>
          <p>الرجاء النقر على الرابط أدناه لإعادة تعيين كلمة المرور:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">إعادة تعيين كلمة المرور</a>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.</p>
          <p>مع تحيات،<br>فريق نظام إدارة المستخدمين</p>
        </div>
      `
    };

    await sendEmail(mailOptions);

    req.flash('success_msg', 'تم إرسال رسالة إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء إرسال رسالة إعادة تعيين كلمة المرور');
    res.redirect('/auth/forgot-password');
  }
});

// Reset password route
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('يجب أن تكون كلمة المرور على الأقل 6 أحرف'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('كلمات المرور غير متطابقة');
    }
    return true;
  })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/auth/reset-password/${req.params.token}`);
  }

  try {
    // Find user with reset token and check if token is still valid
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية');
      return res.redirect('/auth/forgot-password');
    }

    // Update password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash('success_msg', 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    res.redirect(`/auth/reset-password/${req.params.token}`);
  }
});

// Logout route
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.flash('success_msg', 'تم تسجيل الخروج بنجاح');
  res.redirect('/auth/login');
});

// Render register page
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'تسجيل مستخدم جديد' });
});

// Render login page
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'تسجيل الدخول' });
});

// Render forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { title: 'نسيت كلمة المرور' });
});

// Render reset password page
router.get('/reset-password/:token', async (req, res) => {
  try {
    // Find user with reset token and check if token is still valid
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية');
      return res.redirect('/auth/forgot-password');
    }

    res.render('auth/reset-password', {
      title: 'إعادة تعيين كلمة المرور',
      token: req.params.token
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'حدث خطأ أثناء التحقق من رمز إعادة تعيين كلمة المرور');
    res.redirect('/auth/forgot-password');
  }
});

module.exports = router;
