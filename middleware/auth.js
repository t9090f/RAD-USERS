const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
exports.isAuthenticated = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      req.flash('error_msg', 'الرجاء تسجيل الدخول للوصول إلى هذه الصفحة');
      return res.redirect('/auth/login');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      req.flash('error_msg', 'المستخدم غير موجود');
      return res.redirect('/auth/login');
    }
    
    // Set user in request object
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'جلسة غير صالحة. الرجاء تسجيل الدخول مرة أخرى');
    res.redirect('/auth/login');
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  req.flash('error_msg', 'غير مصرح لك بالوصول إلى هذه الصفحة');
  res.redirect('/');
};

// Middleware to check if user is manager or admin
exports.isManager = (req, res, next) => {
  if (req.user && (req.user.role === 'manager' || req.user.role === 'admin')) {
    return next();
  }
  
  req.flash('error_msg', 'غير مصرح لك بالوصول إلى هذه الصفحة');
  res.redirect('/');
};

// Middleware to check if user is regular user
exports.isUser = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    return next();
  }
  
  // Redirect admins and managers to their respective dashboards
  if (req.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else if (req.user.role === 'manager') {
    return res.redirect('/admin/manager/dashboard');
  }
  
  req.flash('error_msg', 'غير مصرح لك بالوصول إلى هذه الصفحة');
  res.redirect('/');
};
