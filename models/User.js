const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false // حقل الاسم غير إلزامي
  },
  email: {
    type: String,
    required: [true, 'الرجاء إدخال البريد الإلكتروني'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'الرجاء إدخال بريد إلكتروني صحيح']
  },
  password: {
    type: String,
    required: [true, 'الرجاء إدخال كلمة المرور'],
    minlength: [6, 'يجب أن تكون كلمة المرور على الأقل 6 أحرف']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  arabicName: {
    type: String
  },
  englishName: {
    type: String
  },
  civilId: {
    type: String
  },
  nationality: {
    type: String
  },
  gender: {
    type: String
  },
  birthDate: {
    type: Date
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  workEmail: {
    type: String
  },
  specialization: {
    type: String
  },
  jobTitle: {
    type: String
  },
  employeeId: {
    type: String
  },
  department: {
    type: String
  },
  currentWork: {
    type: String
  },
  hiringDate: {
    type: Date
  },
  professionalClassificationId: {
    type: String
  },
  professionalClassificationExpiryDate: {
    type: Date
  },
  profileImage: {
    type: String,
    default: 'default-profile.jpg'
  },
  profileImageData: {
    type: String, // لتخزين الصورة كبيانات Base64
    default: null
  },
  profileImageMimeType: {
    type: String, // لتخزين نوع الملف
    default: null
  },
  files: [{
    filename: String,
    originalname: String,
    displayName: {
      type: String,
      default: '' // لتخزين الاسم المخصص للملف
    },
    path: String,
    mimetype: String,
    size: Number,
    fileData: String, // لتخزين بيانات الملف كبيانات Base64
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
