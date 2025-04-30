// Main JavaScript file for User Management System

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Bootstrap tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize Bootstrap popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });

  // Auto-hide alerts after 5 seconds
  setTimeout(function() {
    var alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
      var bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    });
  }, 5000);

  // Password strength meter
  const passwordInputs = document.querySelectorAll('input[type="password"][id="password"]');
  passwordInputs.forEach(function(input) {
    input.addEventListener('input', function() {
      const password = this.value;
      let strength = 0;
      
      // Check password length
      if (password.length >= 8) strength += 1;
      
      // Check for mixed case
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
      
      // Check for numbers
      if (password.match(/\d/)) strength += 1;
      
      // Check for special characters
      if (password.match(/[^a-zA-Z\d]/)) strength += 1;
      
      // Update strength meter if it exists
      const strengthMeter = this.parentElement.querySelector('.password-strength');
      if (strengthMeter) {
        strengthMeter.className = 'password-strength';
        
        if (password.length === 0) {
          strengthMeter.textContent = '';
        } else if (strength < 2) {
          strengthMeter.textContent = 'ضعيفة';
          strengthMeter.classList.add('text-danger');
        } else if (strength === 2) {
          strengthMeter.textContent = 'متوسطة';
          strengthMeter.classList.add('text-warning');
        } else if (strength === 3) {
          strengthMeter.textContent = 'جيدة';
          strengthMeter.classList.add('text-info');
        } else {
          strengthMeter.textContent = 'قوية';
          strengthMeter.classList.add('text-success');
        }
      }
    });
  });

  // Confirm password validation
  const passwordForm = document.querySelector('form:has(input[name="confirmPassword"])');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(event) {
      const password = this.querySelector('input[name="password"]').value;
      const confirmPassword = this.querySelector('input[name="confirmPassword"]').value;
      
      if (password !== confirmPassword) {
        event.preventDefault();
        alert('كلمات المرور غير متطابقة');
      }
    });
  }

  // File upload preview
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      const filePreview = document.querySelector('.file-preview');
      if (filePreview && this.files && this.files[0]) {
        const file = this.files[0];
        const fileType = file.type.split('/')[0];
        
        if (fileType === 'image') {
          const reader = new FileReader();
          reader.onload = function(e) {
            filePreview.innerHTML = `<img src="${e.target.result}" class="img-fluid" alt="معاينة الملف">`;
          };
          reader.readAsDataURL(file);
        } else {
          filePreview.innerHTML = `<div class="p-3 bg-light text-center">
            <i class="fas fa-file fa-3x mb-2"></i>
            <p>${file.name}</p>
            <p>${(file.size / 1024).toFixed(2)} كيلوبايت</p>
          </div>`;
        }
      }
    });
  }

  // Profile image preview
  const profileImageInput = document.querySelector('input[type="file"][name="profileImage"]');
  if (profileImageInput) {
    profileImageInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        const profileImage = document.querySelector('.profile-image-preview') || this.closest('.card').querySelector('img');
        
        reader.onload = function(e) {
          profileImage.src = e.target.result;
        };
        
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // Confirm delete
  const deleteForms = document.querySelectorAll('form[onsubmit*="confirm"]');
  deleteForms.forEach(function(form) {
    form.addEventListener('submit', function(event) {
      const confirmMessage = this.getAttribute('onsubmit').match(/'([^']+)'/)[1];
      if (!confirm(confirmMessage)) {
        event.preventDefault();
      }
    });
  });
});
