const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // السماح بالشهادات غير الموثوقة للتجربة
  }
});

// Function to send email
const sendEmail = async (options) => {
  try {
    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"نظام إدارة المستخدمين" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    console.log(`تم إرسال البريد الإلكتروني: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('خطأ في إرسال البريد الإلكتروني:', error);
    throw error;
  }
};

module.exports = sendEmail;
