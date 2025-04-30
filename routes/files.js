const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// مسار لعرض الصور من قاعدة البيانات
router.get('/image/:filename', async (req, res) => {
  try {
    console.log('طلب عرض الصورة:', req.params.filename);
    
    // البحث عن المستخدم الذي يملك الصورة باسم الملف
    const user = await User.findOne({ profileImage: req.params.filename });
    
    if (!user || !user.profileImageData) {
      console.log('لم يتم العثور على الصورة:', req.params.filename);
      return res.redirect('/img/default-profile.jpg');
    }
    
    // تحديد نوع المحتوى من البيانات المخزنة أو من الامتداد
    let contentType = user.profileImageMimeType || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      // التأكد من أن نوع المحتوى هو صورة
      const filename = req.params.filename;
      const ext = filename.split('.').pop().toLowerCase();
      
      if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else contentType = 'image/jpeg'; // افتراضي
    }
    
    // تحويل البيانات من Base64 إلى بيانات ثنائية
    const imageBuffer = Buffer.from(user.profileImageData, 'base64');
    
    // ضبط رؤوس الاستجابة بشكل صحيح
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length
    });
    
    // إرسال الصورة كتدفق بيانات
    return res.end(imageBuffer);
  } catch (error) {
    console.error('خطأ في استرجاع الصورة:', error);
    res.redirect('/img/default-profile.jpg');
  }
});

// مسار لعرض الملفات العامة من قاعدة البيانات
router.get('/view/:fileId', async (req, res) => {
  try {
    console.log('طلب عرض الملف:', req.params.fileId);
    
    // البحث عن المستخدم الذي يملك الملف
    const user = await User.findOne({ 'files._id': req.params.fileId });
    
    if (!user) {
      console.log('لم يتم العثور على المستخدم الذي يملك الملف:', req.params.fileId);
      return res.status(404).send('الملف غير موجود');
    }
    
    // البحث عن الملف في مصفوفة ملفات المستخدم
    const userFile = user.files.find(f => f._id.toString() === req.params.fileId);
    
    if (!userFile || !userFile.fileData) {
      console.log('لم يتم العثور على الملف أو بيانات الملف:', req.params.fileId);
      return res.status(404).send('الملف غير موجود أو لا يحتوي على بيانات');
    }
    
    console.log('تم العثور على الملف في نموذج المستخدم:', userFile.originalname);
    
    // تحديد نوع المحتوى بناءً على نوع الملف
    let contentType = userFile.mimetype || 'application/octet-stream';
    let disposition = 'inline'; // الافتراضي هو عرض الملف في المتصفح
    
    // التأكد من نوع المحتوى بناءً على امتداد الملف
    if (userFile.originalname) {
      const ext = userFile.originalname.split('.').pop().toLowerCase();
      
      if (ext === 'jpg' || ext === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === 'png') {
        contentType = 'image/png';
      } else if (ext === 'gif') {
        contentType = 'image/gif';
      } else if (ext === 'pdf') {
        contentType = 'application/pdf';
        disposition = 'inline';
      } else if (ext === 'txt') {
        contentType = 'text/plain';
      } else if (ext === 'doc' || ext === 'docx') {
        contentType = 'application/msword';
        disposition = 'attachment';
      } else if (ext === 'xls' || ext === 'xlsx') {
        contentType = 'application/vnd.ms-excel';
        disposition = 'attachment';
      } else {
        disposition = 'attachment';
      }
    }
    
    console.log('نوع المحتوى:', contentType, 'طريقة العرض:', disposition);
    
    // تحويل البيانات من Base64 إلى بيانات ثنائية
    const fileBuffer = Buffer.from(userFile.fileData, 'base64');
    
    // ضبط رؤوس الاستجابة بشكل صحيح
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length,
      'Content-Disposition': `${disposition}; filename="${userFile.originalname}"`
    });
    
    // إرسال الملف كتدفق بيانات
    return res.end(fileBuffer);
  } catch (error) {
    console.error('خطأ في عرض الملف:', error);
    res.status(500).send('حدث خطأ أثناء محاولة عرض الملف');
  }
});

// مسار للتعامل مع المسارات القديمة للصور
router.get('/users/:userId/:filename', (req, res) => {
  res.redirect(`/files/image/${req.params.filename}`);
});

// مسار للتعامل مع المسارات القديمة البديلة
router.get('/uploads/:filename', (req, res) => {
  res.redirect(`/files/image/${req.params.filename}`);
});

module.exports = router;
