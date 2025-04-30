# نظام إدارة المستخدمين

نظام متكامل لإدارة بيانات المستخدمين وملفاتهم باستخدام Node.js و MongoDB.

## المميزات

- واجهة مستخدم بالعربية مع تصميم متجاوب
- نظام مصادقة وتحقق متكامل (تسجيل، تسجيل دخول، تأكيد البريد الإلكتروني)
- إدارة المستخدمين (إضافة، تعديل، حذف)
- إدارة الملفات (رفع، عرض، حذف)
- أنواع مختلفة من المستخدمين (عادي، مشرف، مدير)
- لوحات تحكم مخصصة لكل نوع من المستخدمين
- تصميم جميل باستخدام Bootstrap مع خط Cairo

## متطلبات النظام

- Node.js (الإصدار 14 أو أعلى)
- MongoDB (الإصدار 4 أو أعلى)
- حساب بريد إلكتروني لإرسال رسائل التأكيد وإعادة تعيين كلمة المرور

## التثبيت

1. قم بتنزيل أو استنساخ المشروع:

```bash
git clone https://github.com/yourusername/user-management-system.git
cd user-management-system
```

2. قم بتثبيت الحزم المطلوبة:

```bash
npm install
```

3. قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع وأضف المتغيرات البيئية التالية:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/userManagementSystem
SESSION_SECRET=سر_الجلسة_الآمن_للتطبيق
JWT_SECRET=مفتاح_التوكن_السري_للتطبيق
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
BASE_URL=http://localhost:3000
```

4. قم بإنشاء المجلدات اللازمة لتخزين الملفات:

```bash
mkdir -p public/uploads/users
mkdir -p public/img
```

5. قم بتشغيل التطبيق:

```bash
npm start
```

أو للتطوير:

```bash
npm run dev
```

6. افتح المتصفح وانتقل إلى `http://localhost:3000`

## هيكل المشروع

```
UserManagementSystem/
├── config/             # ملفات الإعدادات
├── controllers/        # وحدات التحكم
├── middleware/         # الوسائط البرمجية
├── models/             # نماذج قاعدة البيانات
├── public/             # الملفات الثابتة
│   ├── css/            # ملفات CSS
│   ├── js/             # ملفات JavaScript
│   ├── fonts/          # الخطوط
│   ├── img/            # الصور
│   └── uploads/        # الملفات المرفوعة
├── routes/             # مسارات API
├── views/              # قوالب EJS
│   ├── admin/          # صفحات المدير
│   ├── auth/           # صفحات المصادقة
│   ├── partials/       # أجزاء القوالب المشتركة
│   └── users/          # صفحات المستخدم
├── .env                # متغيرات البيئة
├── app.js              # نقطة الدخول للتطبيق
├── package.json        # تبعيات المشروع
└── README.md           # توثيق المشروع
```

## إنشاء مستخدم مدير

لإنشاء مستخدم مدير، قم بالتسجيل كمستخدم عادي أولاً، ثم قم بتغيير دور المستخدم في قاعدة البيانات:

```javascript
// باستخدام MongoDB Shell
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin", isVerified: true } })
```

## الأمان

- كلمات المرور مشفرة باستخدام bcrypt
- استخدام JWT للمصادقة
- حماية ضد هجمات CSRF
- التحقق من المدخلات باستخدام express-validator

## المساهمة

نرحب بمساهماتكم! يرجى إنشاء fork للمشروع وإرسال طلب سحب مع التغييرات المقترحة.

## الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE).
