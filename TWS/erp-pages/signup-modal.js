/**
 * Self-Serve Tenant Signup Modal
 * Multi-step signup flow with email verification
 */

class SignupModal {
  constructor(industry = null) {
    this.industry = industry || this.getIndustryFromURL();
    this.currentStep = 1;
    this.userData = {};
    this.verificationId = null;
    this.apiBaseUrl = window.API_BASE_URL || '/api';
    
    this.init();
  }

  init() {
    this.createModalHTML();
    this.attachEventListeners();
  }

  getIndustryFromURL() {
    const path = window.location.pathname;
    if (path.includes('healthcare')) return 'healthcare';
    if (path.includes('software-house')) return 'software_house';
    return 'business';
  }

  createModalHTML() {
    const modalHTML = `
      <div id="signupModal" class="signup-modal" style="display: none;">
        <div class="signup-modal-overlay"></div>
        <div class="signup-modal-content">
          <button class="signup-modal-close" onclick="signupModal.close()">&times;</button>
          
          <!-- Step 1: Email & Password -->
          <div class="signup-step" id="step1">
            <h2>Create Your Account</h2>
            <p class="signup-subtitle">Start your free trial - no credit card required</p>
            
            <form id="signupForm1" class="signup-form">
              <div class="form-group">
                <label for="fullName">Full Name</label>
                <input type="text" id="fullName" name="fullName" required>
              </div>
              
              <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required>
                <small class="form-hint">We'll send a verification code to this email</small>
              </div>
              
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required minlength="12">
                <div class="password-strength" id="passwordStrength"></div>
                <small class="form-hint">Minimum 12 characters with uppercase, lowercase, numbers, and special characters</small>
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
              </div>
              
              <button type="submit" class="btn btn-primary btn-block">Continue</button>
            </form>
          </div>
          
          <!-- Step 2: Email Verification -->
          <div class="signup-step" id="step2" style="display: none;">
            <h2>Verify Your Email</h2>
            <p class="signup-subtitle">We sent a 6-digit code to <strong id="verificationEmail"></strong></p>
            
            <form id="signupForm2" class="signup-form">
              <div class="form-group">
                <label for="otp">Verification Code</label>
                <input type="text" id="otp" name="otp" maxlength="6" pattern="[0-9]{6}" required 
                       placeholder="000000" style="text-align: center; font-size: 24px; letter-spacing: 8px;">
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="signupModal.resendOTP()">Resend Code</button>
                <button type="submit" class="btn btn-primary">Verify Email</button>
              </div>
            </form>
          </div>
          
          <!-- Step 3: Organization Details -->
          <div class="signup-step" id="step3" style="display: none;">
            <h2>Set Up Your Organization</h2>
            <p class="signup-subtitle">Almost there! Just a few more details</p>
            
            <form id="signupForm3" class="signup-form">
              <div class="form-group">
                <label for="organizationName">Organization Name</label>
                <input type="text" id="organizationName" name="organizationName" required>
              </div>
              
              <div class="form-group">
                <label for="slug">Tenant Subdomain</label>
                <div class="slug-input-wrapper">
                  <input type="text" id="slug" name="slug" required pattern="[a-z0-9-]+" 
                         oninput="signupModal.checkSlugAvailability()">
                  <span class="slug-suffix">.tws.example.com</span>
                </div>
                <div id="slugStatus" class="slug-status"></div>
                <small class="form-hint">3-50 characters, lowercase letters, numbers, and hyphens only</small>
              </div>
              
              <div class="form-group">
                <label for="industrySelect">Industry</label>
                <select id="industrySelect" name="industry" required>
                  <option value="business">General Business</option>
                  <option value="healthcare" ${this.industry === 'healthcare' ? 'selected' : ''}>Healthcare</option>
                  <option value="software_house" ${this.industry === 'software_house' ? 'selected' : ''}>Software House</option>
                  <option value="warehouse">Warehouse</option>
                </select>
              </div>
              
              <button type="submit" class="btn btn-primary btn-block" id="createTenantBtn" disabled>Create Tenant</button>
            </form>
          </div>
          
          <!-- Step 4: Confirmation -->
          <div class="signup-step" id="step4" style="display: none;">
            <div class="signup-success">
              <div class="success-icon">✓</div>
              <h2>Welcome to TWS ERP!</h2>
              <p>Your tenant is being provisioned. This may take a few moments...</p>
              <div class="loading-spinner"></div>
              <p id="provisioningStatus">Setting up your ERP instance...</p>
            </div>
          </div>
          
          <!-- Progress Indicator -->
          <div class="signup-progress">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill" style="width: 25%;"></div>
            </div>
            <div class="progress-steps">
              <span class="progress-step ${this.currentStep >= 1 ? 'active' : ''}">1</span>
              <span class="progress-step ${this.currentStep >= 2 ? 'active' : ''}">2</span>
              <span class="progress-step ${this.currentStep >= 3 ? 'active' : ''}">3</span>
              <span class="progress-step ${this.currentStep >= 4 ? 'active' : ''}">4</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add CSS if not already added
    if (!document.getElementById('signupModalStyles')) {
      this.addStyles();
    }
  }

  addStyles() {
    const styles = `
      <style id="signupModalStyles">
        .signup-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        .signup-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
        }
        .signup-modal-content {
          position: relative;
          max-width: 500px;
          margin: 50px auto;
          background: #1a1a1a;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          max-height: 90vh;
          overflow-y: auto;
        }
        .signup-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: #fff;
          font-size: 32px;
          cursor: pointer;
          line-height: 1;
        }
        .signup-step h2 {
          color: #fff;
          margin-bottom: 10px;
        }
        .signup-subtitle {
          color: #9ca3af;
          margin-bottom: 30px;
        }
        .signup-form .form-group {
          margin-bottom: 20px;
        }
        .signup-form label {
          display: block;
          color: #fff;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .signup-form input,
        .signup-form select {
          width: 100%;
          padding: 12px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }
        .signup-form input:focus,
        .signup-form select:focus {
          outline: none;
          border-color: #667eea;
        }
        .form-hint {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-top: 4px;
        }
        .password-strength {
          height: 4px;
          background: #2a2a2a;
          border-radius: 2px;
          margin-top: 8px;
        }
        .password-strength.weak { background: #ef4444; }
        .password-strength.medium { background: #f59e0b; }
        .password-strength.strong { background: #10b981; }
        .slug-input-wrapper {
          display: flex;
          align-items: center;
        }
        .slug-input-wrapper input {
          flex: 1;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        .slug-suffix {
          padding: 12px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-left: none;
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
          color: #9ca3af;
          font-size: 14px;
        }
        .slug-status {
          margin-top: 8px;
          font-size: 14px;
        }
        .slug-status.available { color: #10b981; }
        .slug-status.taken { color: #ef4444; }
        .slug-status.checking { color: #f59e0b; }
        .btn-block {
          width: 100%;
        }
        .form-actions {
          display: flex;
          gap: 10px;
        }
        .form-actions button {
          flex: 1;
        }
        .signup-success {
          text-align: center;
          padding: 40px 0;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #fff;
          margin: 0 auto 20px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #3a3a3a;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .signup-progress {
          margin-top: 30px;
        }
        .progress-bar {
          height: 4px;
          background: #2a2a2a;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }
        .progress-steps {
          display: flex;
          justify-content: space-between;
        }
        .progress-step {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2a2a2a;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .progress-step.active {
          background: #667eea;
          color: #fff;
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  attachEventListeners() {
    // Step 1: Register
    document.getElementById('signupForm1').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStep1();
    });

    // Step 2: Verify Email
    document.getElementById('signupForm2').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStep2();
    });

    // Step 3: Create Tenant
    document.getElementById('signupForm3').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStep3();
    });

    // Password strength checker
    document.getElementById('password').addEventListener('input', (e) => {
      this.checkPasswordStrength(e.target.value);
    });

    // Slug availability checker (debounced)
    let slugCheckTimeout;
    document.getElementById('slug').addEventListener('input', (e) => {
      clearTimeout(slugCheckTimeout);
      slugCheckTimeout = setTimeout(() => {
        this.checkSlugAvailability();
      }, 500);
    });
  }

  async handleStep1() {
    const formData = new FormData(document.getElementById('signupForm1'));
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName')
    };

    // Validate passwords match
    if (data.password !== document.getElementById('confirmPassword').value) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/register?industry=${this.industry}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.userData = { ...data, userId: result.data.userId };
        this.verificationId = result.data.verificationId;
        this.goToStep(2);
        document.getElementById('verificationEmail').textContent = data.email;
      } else {
        alert(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  }

  async handleStep2() {
    const otp = document.getElementById('otp').value;

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.userData.email,
          otp
        })
      });

      const result = await response.json();

      if (result.success) {
        this.userData.userId = result.data.userId;
        this.goToStep(3);
      } else {
        alert(result.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Verification failed. Please try again.');
    }
  }

  async handleStep3() {
    const formData = new FormData(document.getElementById('signupForm3'));
    const data = {
      userId: this.userData.userId,
      organizationName: formData.get('organizationName'),
      slug: formData.get('slug').toLowerCase(),
      industry: formData.get('industry')
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/create-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.goToStep(4);
        // Redirect to tenant subdomain after a delay
        setTimeout(() => {
          const subdomain = `${data.slug}.${window.location.hostname.replace('www.', '')}`;
          window.location.href = `https://${subdomain}/onboarding`;
        }, 3000);
      } else {
        alert(result.message || 'Tenant creation failed');
      }
    } catch (error) {
      console.error('Tenant creation error:', error);
      alert('Tenant creation failed. Please try again.');
    }
  }

  async checkSlugAvailability() {
    const slug = document.getElementById('slug').value.toLowerCase();
    const statusEl = document.getElementById('slugStatus');
    const createBtn = document.getElementById('createTenantBtn');

    if (!slug || slug.length < 3) {
      statusEl.textContent = '';
      createBtn.disabled = true;
      return;
    }

    statusEl.textContent = 'Checking availability...';
    statusEl.className = 'slug-status checking';

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/check-slug-availability?slug=${slug}`);
      const result = await response.json();

      if (result.success && result.data.available) {
        statusEl.textContent = '✓ Available';
        statusEl.className = 'slug-status available';
        createBtn.disabled = false;
      } else {
        statusEl.textContent = `✗ ${result.data.message || 'Not available'}`;
        statusEl.className = 'slug-status taken';
        createBtn.disabled = true;
      }
    } catch (error) {
      console.error('Slug check error:', error);
      statusEl.textContent = 'Error checking availability';
      statusEl.className = 'slug-status taken';
      createBtn.disabled = true;
    }
  }

  async resendOTP() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.userData.email })
      });

      const result = await response.json();
      alert(result.message || 'Code resent');
    } catch (error) {
      console.error('Resend OTP error:', error);
      alert('Failed to resend code. Please try again.');
    }
  }

  checkPasswordStrength(password) {
    const strengthEl = document.getElementById('passwordStrength');
    let strength = 0;

    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    strengthEl.className = 'password-strength';
    if (strength <= 2) {
      strengthEl.className += ' weak';
    } else if (strength <= 3) {
      strengthEl.className += ' medium';
    } else if (strength >= 4) {
      strengthEl.className += ' strong';
    }
  }

  goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.signup-step').forEach(el => {
      el.style.display = 'none';
    });

    // Show current step
    document.getElementById(`step${step}`).style.display = 'block';

    // Update progress
    this.currentStep = step;
    const progress = (step / 4) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    // Update progress steps
    document.querySelectorAll('.progress-step').forEach((el, index) => {
      if (index + 1 <= step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  open() {
    document.getElementById('signupModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  close() {
    document.getElementById('signupModal').style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Initialize modal
let signupModal;
document.addEventListener('DOMContentLoaded', () => {
  const industry = new URLSearchParams(window.location.search).get('industry') || 
                   window.location.pathname.split('/').pop().replace('.html', '');
  signupModal = new SignupModal(industry);
  
  // Make it globally accessible
  window.signupModal = signupModal;
});
