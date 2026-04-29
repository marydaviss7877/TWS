/**
 * Industry-Specific Self-Serve Tenant Signup Modal
 * Uses separate flows for each ERP category (Option 2)
 */

class SignupModalV2 {
  constructor(industry = null) {
    this.industry = industry || this.getIndustryFromURL();
    
    // Ensure SignupFlows is available
    if (typeof SignupFlows === 'undefined') {
      console.error('SignupFlows is not defined. Make sure signup-flows.js is loaded before signup-modal-v2.js');
      throw new Error('SignupFlows not available');
    }
    
    // Validate industry exists in flows
    if (!SignupFlows[this.industry]) {
      console.warn(`Industry flow '${this.industry}' not found, using 'business' flow`);
      this.industry = 'business';
    }
    
    this.flow = SignupFlows[this.industry] || SignupFlows.business;
    this.currentStep = 1;
    this.userData = {};
    this.verificationId = null;
    this.apiBaseUrl = window.API_BASE_URL || '/api';
    
    this.init();
  }

  init() {
    try {
      this.createModalHTML();
      this.attachEventListeners();
      console.log('Modal initialized successfully for', this.industry);
    } catch (error) {
      console.error('Error in modal init:', error);
      throw error;
    }
  }

  getIndustryFromURL() {
    const path = window.location.pathname;
    if (path.includes('healthcare')) return 'healthcare';
    if (path.includes('software-house')) return 'software_house';
    if (path.includes('warehouse')) return 'warehouse';
    return 'business';
  }

  createModalHTML() {
    if (!this.flow || !this.flow.steps || !Array.isArray(this.flow.steps)) {
      throw new Error('Invalid flow configuration. Flow steps not found.');
    }

    try {
      const stepsHTML = this.flow.steps.map((step, index) => {
        return this.generateStepHTML(step, index + 1);
      }).join('');

      const progressStepsHTML = this.flow.steps.map((step, index) => {
        return `<span class="progress-step" data-step="${index + 1}">${index + 1}</span>`;
      }).join('');

      const progressPercentage = (1 / this.flow.steps.length) * 100;

      const modalHTML = `
        <div id="signupModal" class="signup-modal" style="display: none;">
          <div class="signup-modal-overlay"></div>
          <div class="signup-modal-content">
            <button class="signup-modal-close" onclick="if(window.signupModal){window.signupModal.close();}">&times;</button>
            
            ${stepsHTML}
            
            <!-- Progress Indicator -->
            <div class="signup-progress">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: ${progressPercentage}%;"></div>
              </div>
              <div class="progress-steps">
                ${progressStepsHTML}
              </div>
            </div>
          </div>
        </div>
      `;

      // Check if modal already exists
      const existingModal = document.getElementById('signupModal');
      if (existingModal) {
        existingModal.remove();
      }

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.addStyles();
      
      console.log('Modal HTML created successfully');
    } catch (error) {
      console.error('Error creating modal HTML:', error);
      throw error;
    }
  }

  generateStepHTML(step, stepNumber) {
    if (step.type === 'confirmation') {
      return `
        <div class="signup-step" id="step${stepNumber}" style="display: none;">
          <div class="signup-success">
            <div class="success-icon">✓</div>
            <h2>${step.title}</h2>
            <p>${step.subtitle}</p>
            <div class="loading-spinner"></div>
            <p id="provisioningStatus">Setting up your ERP instance...</p>
          </div>
        </div>
      `;
    }

    const fieldsHTML = step.fields.map(field => {
      return this.generateFieldHTML(field, stepNumber);
    }).join('');

    const formId = `signupForm${stepNumber}`;
    const isOTPStep = step.fields.some(f => f.type === 'otp');

    return `
      <div class="signup-step" id="step${stepNumber}" style="display: ${stepNumber === 1 ? 'block' : 'none'};">
        <h2>${step.title}</h2>
        <p class="signup-subtitle">${step.subtitle}</p>
        
        <form id="${formId}" class="signup-form">
          ${fieldsHTML}
          
          ${isOTPStep ? `
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="signupModal.resendOTP()">Resend Code</button>
              <button type="submit" class="btn btn-primary">Verify Email</button>
            </div>
          ` : `
            <button type="submit" class="btn btn-primary btn-block">${stepNumber === this.flow.steps.length - 1 ? 'Create Tenant' : 'Continue'}</button>
          `}
        </form>
      </div>
    `;
  }

  generateFieldHTML(field, stepNumber) {
    if (field.type === 'hidden') {
      return `<input type="hidden" name="${field.name}" value="${field.value || ''}">`;
    }

    let inputHTML = '';
    const fieldId = `${field.name}_step${stepNumber}`;
    const requiredAttr = field.required ? 'required' : '';
    const minlengthAttr = field.minlength ? `minlength="${field.minlength}"` : '';
    const minAttr = field.min ? `min="${field.min}"` : '';

    switch (field.type) {
      case 'select':
        const optionsHTML = field.options.map(opt => 
          `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
        inputHTML = `
          <select id="${fieldId}" name="${field.name}" ${requiredAttr}>
            ${field.required ? '<option value="">Select...</option>' : ''}
            ${optionsHTML}
          </select>
        `;
        break;

      case 'otp':
        inputHTML = `
          <input type="text" id="${fieldId}" name="${field.name}" 
                 maxlength="${field.length || 6}" pattern="[0-9]{${field.length || 6}}" 
                 ${requiredAttr}
                 placeholder="000000" 
                 style="text-align: center; font-size: 24px; letter-spacing: 8px;">
        `;
        break;

      case 'slug':
        inputHTML = `
          <div class="slug-input-wrapper">
            <input type="text" id="${fieldId}" name="${field.name}" 
                   pattern="[a-z0-9-]+" ${requiredAttr}
                   oninput="signupModal.checkSlugAvailability('${fieldId}')">
            <span class="slug-suffix">.tws.example.com</span>
          </div>
          <div id="${fieldId}_status" class="slug-status"></div>
        `;
        break;

      case 'password':
        inputHTML = `
          <input type="password" id="${fieldId}" name="${field.name}" 
                 ${requiredAttr} ${minlengthAttr}>
          ${field.showStrength ? '<div class="password-strength" id="' + fieldId + '_strength"></div>' : ''}
        `;
        break;

      case 'number':
        inputHTML = `
          <input type="number" id="${fieldId}" name="${field.name}" 
                 ${requiredAttr} ${minAttr}>
        `;
        break;

      case 'tel':
        inputHTML = `
          <input type="tel" id="${fieldId}" name="${field.name}" 
                 ${requiredAttr}>
        `;
        break;

      case 'email':
        inputHTML = `
          <input type="email" id="${fieldId}" name="${field.name}" 
                 ${requiredAttr}>
        `;
        break;

      default: // text
        inputHTML = `
          <input type="text" id="${fieldId}" name="${field.name}" 
                 ${requiredAttr}>
        `;
    }

    return `
      <div class="form-group">
        <label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>
        ${inputHTML}
        ${field.hint ? `<small class="form-hint">${field.hint}</small>` : ''}
      </div>
    `;
  }

  attachEventListeners() {
    // Attach form submit handlers for each step
    this.flow.steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const formId = `signupForm${stepNumber}`;
      const form = document.getElementById(formId);
      
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleStepSubmit(stepNumber, step);
        });
      }
    });

    // Add real-time email validation for email fields
    this.flow.steps.forEach((step, index) => {
      step.fields.forEach(field => {
        if (field.type === 'email') {
          const fieldId = `${field.name}_step${index + 1}`;
          const input = document.getElementById(fieldId);
          if (input) {
            let validationTimeout;
            input.addEventListener('blur', () => {
              clearTimeout(validationTimeout);
              this.validateEmailField(input.value, fieldId);
            });
            input.addEventListener('input', () => {
              clearTimeout(validationTimeout);
              validationTimeout = setTimeout(() => {
                if (input.value.length > 5) {
                  this.validateEmailField(input.value, fieldId);
                }
              }, 500);
            });
          }
        }
      });
    });

    // Password strength checker
    this.flow.steps.forEach((step, index) => {
      step.fields.forEach(field => {
        if (field.type === 'password' && field.showStrength) {
          const fieldId = `${field.name}_step${index + 1}`;
          const input = document.getElementById(fieldId);
          if (input) {
            input.addEventListener('input', (e) => {
              this.checkPasswordStrength(e.target.value, fieldId + '_strength');
            });
          }
        }
      });
    });

    // Slug availability checker (debounced)
    let slugCheckTimeout;
    this.flow.steps.forEach((step, index) => {
      step.fields.forEach(field => {
        if (field.type === 'slug' && field.checkAvailability) {
          const fieldId = `${field.name}_step${index + 1}`;
          const input = document.getElementById(fieldId);
          if (input) {
            input.addEventListener('input', (e) => {
              clearTimeout(slugCheckTimeout);
              slugCheckTimeout = setTimeout(() => {
                this.checkSlugAvailability(fieldId);
              }, 500);
            });
          }
        }
      });
    });
  }

  async handleStepSubmit(stepNumber, step) {
    const form = document.getElementById(`signupForm${stepNumber}`);
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      if (stepNumber === 1) {
        // Step 1: Register user
        await this.handleRegistration(data);
      } else if (step.fields.some(f => f.type === 'otp')) {
        // Step with OTP: Verify email
        await this.handleEmailVerification(data);
      } else if (stepNumber === this.flow.steps.length - 1 && step.type !== 'confirmation') {
        // Last step before confirmation: Create tenant
        await this.handleTenantCreation(data);
      } else {
        // Intermediate step: Just move forward
        this.goToStep(stepNumber + 1);
      }
    } catch (error) {
      console.error(`Step ${stepNumber} error:`, error);
      alert(error.message || 'An error occurred. Please try again.');
    }
  }

  async handleRegistration(data) {
    // Determine registration payload based on industry
    let registrationData = {};
    let emailToValidate = '';
    
    if (this.industry === 'legacy') {
      emailToValidate = data.adminEmail;
      registrationData = {
        email: data.adminEmail,
        password: data.adminPassword,
        fullName: `${data.adminFirstName} ${data.adminLastName}`,
        metadata: {
          adminFirstName: data.adminFirstName,
          adminLastName: data.adminLastName
        }
      };
    } else {
      emailToValidate = data.email;
      registrationData = {
        email: data.email,
        password: data.password,
        fullName: data.fullName
      };
    }

    // Validate passwords match
    const passwordField = this.industry === 'legacy' ? 'adminPassword' : 'password';
    const confirmPasswordField = this.industry === 'legacy' ? 'confirmPassword' : 'confirmPassword';
    
    if (data[passwordField] !== data[confirmPasswordField]) {
      throw new Error('Passwords do not match');
    }

    // Validate email before registration
    try {
      const emailValidation = await this.validateEmail(emailToValidate);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message || 'Invalid email address');
      }
    } catch (error) {
      // If validation fails, show error but allow registration to proceed
      // (DNS checks might fail due to network issues)
      console.warn('Email validation warning:', error.message);
      // Continue with registration - backend will do final validation
    }

    const response = await fetch(`${this.apiBaseUrl}/signup/register?industry=${this.industry}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });

    const result = await response.json();

    if (result.success) {
      this.userData = { ...data, userId: result.data.userId };
      this.verificationId = result.data.verificationId;
      this.goToStep(2);
      
      // Update verification email display if exists
      const emailDisplay = document.getElementById('verificationEmail');
      if (emailDisplay) {
        emailDisplay.textContent = registrationData.email;
      }
    } else {
      throw new Error(result.message || 'Registration failed');
    }
  }

  async handleEmailVerification(data) {
    const email = this.industry === 'legacy' ? this.userData.adminEmail : this.userData.email;

    const response = await fetch(`${this.apiBaseUrl}/signup/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        otp: data.otp
      })
    });

    const result = await response.json();

    if (result.success) {
      this.userData.userId = result.data.userId;
      this.goToStep(this.currentStep + 1);
    } else {
      throw new Error(result.message || 'Verification failed');
    }
  }

  async handleTenantCreation(data) {
    // Prepare tenant data based on industry
    const tenantData = {
      userId: this.userData.userId,
      industry: data.industry || this.industry
    };

    // Map industry-specific fields
    if (this.industry === 'legacy') {
      tenantData.organizationName = data.schoolName;
      tenantData.slug = data.slug;
      tenantData.metadata = {
        schoolName: data.schoolName,
        schoolType: data.schoolType,
        schoolEmail: data.schoolEmail,
        schoolPhone: data.schoolPhone
      };
    } else if (this.industry === 'healthcare') {
      tenantData.organizationName = data.facilityName;
      tenantData.slug = data.slug;
      tenantData.metadata = {
        facilityName: data.facilityName,
        facilityType: data.facilityType,
        licenseNumber: data.licenseNumber,
        contactPhone: data.contactPhone
      };
    } else if (this.industry === 'software_house') {
      tenantData.organizationName = data.companyName;
      tenantData.slug = data.slug;
      tenantData.metadata = {
        companyName: data.companyName,
        teamSize: data.teamSize,
        primaryTechStack: data.primaryTechStack,
        methodology: data.methodology
      };
    } else if (this.industry === 'warehouse') {
      tenantData.organizationName = data.warehouseName;
      tenantData.slug = data.slug;
      tenantData.metadata = {
        warehouseName: data.warehouseName,
        warehouseType: data.warehouseType,
        squareFootage: data.squareFootage
      };
    } else {
      // Generic business
      tenantData.organizationName = data.organizationName;
      tenantData.slug = data.slug;
    }

    const response = await fetch(`${this.apiBaseUrl}/signup/create-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData)
    });

    const result = await response.json();

    if (result.success) {
      // Go to confirmation step
      const confirmationStep = this.flow.steps.find(s => s.type === 'confirmation');
      if (confirmationStep) {
        this.goToStep(this.flow.steps.indexOf(confirmationStep) + 1);
        
        // Redirect after delay
        setTimeout(() => {
          const subdomain = `${data.slug}.${window.location.hostname.replace('www.', '')}`;
          window.location.href = `https://${subdomain}/onboarding`;
        }, 3000);
      }
    } else {
      throw new Error(result.message || 'Tenant creation failed');
    }
  }

  async checkSlugAvailability(fieldId) {
    const input = document.getElementById(fieldId);
    const slug = input.value.toLowerCase();
    const statusEl = document.getElementById(fieldId + '_status');
    const createBtn = document.querySelector(`#signupForm${this.currentStep} button[type="submit"]`);

    if (!slug || slug.length < 3) {
      if (statusEl) statusEl.textContent = '';
      if (createBtn) createBtn.disabled = true;
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Checking availability...';
      statusEl.className = 'slug-status checking';
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/check-slug-availability?slug=${slug}`);
      const result = await response.json();

      if (result.success && result.data.available) {
        if (statusEl) {
          statusEl.textContent = '✓ Available';
          statusEl.className = 'slug-status available';
        }
        if (createBtn) createBtn.disabled = false;
      } else {
        if (statusEl) {
          statusEl.textContent = `✗ ${result.data.message || 'Not available'}`;
          statusEl.className = 'slug-status taken';
        }
        if (createBtn) createBtn.disabled = true;
      }
    } catch (error) {
      console.error('Slug check error:', error);
      if (statusEl) {
        statusEl.textContent = 'Error checking availability';
        statusEl.className = 'slug-status taken';
      }
      if (createBtn) createBtn.disabled = true;
    }
  }

  async resendOTP() {
    const email = this.industry === 'legacy' ? this.userData.adminEmail : this.userData.email;

    try {
      const response = await fetch(`${this.apiBaseUrl}/signup/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      alert(result.message || 'Code resent');
    } catch (error) {
      console.error('Resend OTP error:', error);
      alert('Failed to resend code. Please try again.');
    }
  }

  async validateEmail(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/email/validate?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email validation error:', error);
      return { valid: true, message: 'Unable to validate email' }; // Allow if validation fails
    }
  }

  async validateEmailField(email, fieldId) {
    if (!email || email.length < 5) return;

    const input = document.getElementById(fieldId);
    if (!input) return;

    // Remove existing validation classes
    input.classList.remove('email-valid', 'email-invalid', 'email-checking');

    // Show checking state
    input.classList.add('email-checking');

    try {
      const result = await this.validateEmail(email);
      
      input.classList.remove('email-checking');
      
      if (result.valid) {
        input.classList.add('email-valid');
        // Remove any error message
        this.removeFieldError(fieldId);
      } else {
        input.classList.add('email-invalid');
        this.showFieldError(fieldId, result.message || 'Invalid email address');
      }
    } catch (error) {
      input.classList.remove('email-checking');
      // Don't show error if validation service is unavailable
    }
  }

  showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    // Remove existing error
    this.removeFieldError(fieldId);

    // Create error element
    const errorEl = document.createElement('small');
    errorEl.className = 'field-error';
    errorEl.textContent = message;
    errorEl.style.color = '#ef4444';
    errorEl.style.display = 'block';
    errorEl.style.marginTop = '4px';
    errorEl.style.fontSize = '12px';

    input.parentElement.appendChild(errorEl);
  }

  removeFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  checkPasswordStrength(password, strengthElId) {
    const strengthEl = document.getElementById(strengthElId);
    if (!strengthEl) return;

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
    const stepEl = document.getElementById(`step${step}`);
    if (stepEl) {
      stepEl.style.display = 'block';
    }

    // Update progress
    this.currentStep = step;
    const progress = (step / this.flow.steps.length) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

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
    const modal = document.getElementById('signupModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      console.error('Signup modal not found. Make sure modal is initialized.');
      // Try to initialize if not already done
      if (!window.signupModal) {
        initializeSignupModal();
        setTimeout(() => {
          if (window.signupModal) {
            window.signupModal.open();
          }
        }, 100);
      }
    }
  }

  close() {
    const modal = document.getElementById('signupModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    } else {
      console.warn('Modal element not found when trying to close');
    }
  }

  addStyles() {
    if (document.getElementById('signupModalStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'signupModalStyles';
    styles.textContent = `
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
        box-sizing: border-box;
      }
      .signup-form input:focus,
      .signup-form select:focus {
        outline: none;
        border-color: #667eea;
      }
      .signup-form input.email-valid {
        border-color: #10b981;
      }
      .signup-form input.email-invalid {
        border-color: #ef4444;
      }
      .signup-form input.email-checking {
        border-color: #f59e0b;
      }
      .field-error {
        color: #ef4444;
        font-size: 12px;
        margin-top: 4px;
        display: block;
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
    `;
    document.head.appendChild(styles);
  }
}

// Initialize modal when DOM is ready
let signupModal;
let modalInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 50; // 5 seconds max wait

function initializeSignupModal() {
  initializationAttempts++;
  
  if (modalInitialized) {
    return; // Already initialized
  }

  if (initializationAttempts > MAX_INIT_ATTEMPTS) {
    console.error('❌ Failed to initialize signup modal after', MAX_INIT_ATTEMPTS, 'attempts');
    console.error('SignupFlows available:', typeof SignupFlows !== 'undefined');
    console.error('SignupModalV2 available:', typeof SignupModalV2 !== 'undefined');
    return;
  }

  // Check if SignupFlows is available
  if (typeof SignupFlows === 'undefined') {
    console.warn('SignupFlows not loaded yet, retrying... (attempt', initializationAttempts, ')');
    setTimeout(initializeSignupModal, 100);
    return;
  }

  // Check if SignupModalV2 class is available
  if (typeof SignupModalV2 === 'undefined') {
    console.error('SignupModalV2 class not found. Check script loading order.');
    return;
  }

  // Detect industry from URL
  const path = window.location.pathname;
  let industry = 'business'; // default
  
  if (path.includes('healthcare')) industry = 'healthcare';
  else if (path.includes('legacy')) industry = 'legacy';
  else if (path.includes('software-house')) industry = 'software_house';
  else if (path.includes('warehouse')) industry = 'warehouse';
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('industry')) {
    industry = urlParams.get('industry');
  }

  // Validate industry exists in flows
  if (!SignupFlows[industry]) {
    console.warn('Industry flow not found:', industry, '- using business flow');
    industry = 'business';
  }

  try {
    signupModal = new SignupModalV2(industry);
    window.signupModal = signupModal;
    modalInitialized = true;
    console.log('✅ Signup modal initialized for industry:', industry);
    
    // Verify modal HTML was created
    const modalElement = document.getElementById('signupModal');
    if (!modalElement) {
      console.error('❌ Modal HTML element not found after initialization');
      modalInitialized = false;
    }
  } catch (error) {
    console.error('❌ Error initializing signup modal:', error);
    console.error('Error stack:', error.stack);
    modalInitialized = false;
  }
}

// Global function to open modal (fallback)
window.openSignupModal = function() {
  console.log('openSignupModal called');
  console.log('window.signupModal:', window.signupModal);
  console.log('modalInitialized:', modalInitialized);
  
  if (!window.signupModal && !modalInitialized) {
    console.log('Modal not initialized, initializing now...');
    initializeSignupModal();
    
    // Wait for initialization with multiple retries
    let retries = 0;
    const checkInterval = setInterval(() => {
      retries++;
      if (window.signupModal && modalInitialized) {
        clearInterval(checkInterval);
        console.log('Modal initialized, opening...');
        window.signupModal.open();
      } else if (retries > 20) {
        clearInterval(checkInterval);
        console.error('Failed to initialize modal after 2 seconds');
        // Try to create modal anyway
        try {
          if (typeof SignupFlows !== 'undefined' && typeof SignupModalV2 !== 'undefined') {
            const path = window.location.pathname;
            let industry = 'business';
            if (path.includes('healthcare')) industry = 'healthcare';
            else if (path.includes('legacy')) industry = 'legacy';
            
            window.signupModal = new SignupModalV2(industry);
            window.signupModal.open();
          } else {
            alert('Signup modal scripts are not loaded. Please check the browser console for errors.');
          }
        } catch (error) {
          console.error('Final attempt failed:', error);
          alert('Unable to open signup modal. Error: ' + error.message + '\n\nPlease check the browser console for details.');
        }
      }
    }, 100);
  } else if (window.signupModal) {
    window.signupModal.open();
  } else {
    console.error('Modal initialization failed');
    alert('Signup modal is not available. Please refresh the page.');
  }
};

// Initialize when DOM is ready
function startInitialization() {
  // Wait a bit to ensure all scripts are loaded
  setTimeout(() => {
    initializeSignupModal();
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInitialization);
} else {
  // DOM already loaded
  startInitialization();
}

// Also try on window load as fallback
window.addEventListener('load', () => {
  if (!modalInitialized && typeof SignupFlows !== 'undefined' && typeof SignupModalV2 !== 'undefined') {
    console.log('Retrying initialization on window load...');
    initializeSignupModal();
  }
});
