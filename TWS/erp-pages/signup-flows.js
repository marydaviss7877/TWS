/**
 * Industry-Specific Signup Flow Definitions
 * Each industry has its own flow configuration with different steps and fields
 */

const SignupFlows = {
  /**
   * Education ERP Signup Flow (5 steps)
   */
  legacy: {
    steps: [
      {
        id: 1,
        title: 'Create Your Account',
        subtitle: 'Start your free trial - no credit card required',
        fields: [
          { name: 'adminFirstName', label: 'First Name', type: 'text', required: true },
          { name: 'adminLastName', label: 'Last Name', type: 'text', required: true },
          { name: 'adminEmail', label: 'Email Address', type: 'email', required: true, hint: 'We\'ll send a verification code to this email' },
          { name: 'adminPassword', label: 'Password', type: 'password', required: true, minlength: 12, showStrength: true, hint: 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true }
        ]
      },
      {
        id: 2,
        title: 'Verify Your Email',
        subtitle: 'We sent a 6-digit code to your email',
        fields: [
          { name: 'otp', label: 'Verification Code', type: 'otp', required: true, length: 6 }
        ]
      },
      {
        id: 3,
        title: 'School Information',
        subtitle: 'Tell us about your school',
        fields: [
          { name: 'schoolName', label: 'School Name', type: 'text', required: true },
          { name: 'schoolType', label: 'School Type', type: 'select', required: true, options: [
            { value: 'school', label: 'K-12 School' },
            { value: 'college', label: 'College' },
            { value: 'university', label: 'University' }
          ]},
          { name: 'schoolEmail', label: 'School Email', type: 'email', required: false, hint: 'Official school email address' },
          { name: 'schoolPhone', label: 'School Phone', type: 'tel', required: false }
        ]
      },
      {
        id: 4,
        title: 'Set Up Your Tenant',
        subtitle: 'Choose your subdomain',
        fields: [
          { name: 'slug', label: 'Tenant Subdomain', type: 'slug', required: true, hint: '3-50 characters, lowercase letters, numbers, and hyphens only', checkAvailability: true },
          { name: 'industry', label: 'Industry', type: 'hidden', value: 'legacy' }
        ]
      },
      {
        id: 5,
        title: 'Welcome!',
        subtitle: 'Your school ERP is being set up',
        type: 'confirmation'
      }
    ]
  },

  /**
   * Healthcare ERP Signup Flow (4 steps)
   */
  healthcare: {
    steps: [
      {
        id: 1,
        title: 'Create Your Account',
        subtitle: 'Start your free trial - no credit card required',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true, hint: 'We\'ll send a verification code to this email' },
          { name: 'password', label: 'Password', type: 'password', required: true, minlength: 12, showStrength: true, hint: 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true }
        ]
      },
      {
        id: 2,
        title: 'Verify Your Email',
        subtitle: 'We sent a 6-digit code to your email',
        fields: [
          { name: 'otp', label: 'Verification Code', type: 'otp', required: true, length: 6 }
        ]
      },
      {
        id: 3,
        title: 'Healthcare Facility Details',
        subtitle: 'Tell us about your facility',
        fields: [
          { name: 'facilityName', label: 'Hospital/Clinic Name', type: 'text', required: true },
          { name: 'facilityType', label: 'Facility Type', type: 'select', required: true, options: [
            { value: 'hospital', label: 'Hospital' },
            { value: 'clinic', label: 'Clinic' },
            { value: 'medical_center', label: 'Medical Center' },
            { value: 'pharmacy', label: 'Pharmacy' }
          ]},
          { name: 'licenseNumber', label: 'License Number', type: 'text', required: false, hint: 'Healthcare facility license number' },
          { name: 'contactPhone', label: 'Contact Phone', type: 'tel', required: false },
          { name: 'slug', label: 'Tenant Subdomain', type: 'slug', required: true, hint: '3-50 characters, lowercase letters, numbers, and hyphens only', checkAvailability: true },
          { name: 'industry', label: 'Industry', type: 'hidden', value: 'healthcare' }
        ]
      },
      {
        id: 4,
        title: 'Welcome!',
        subtitle: 'Your healthcare ERP is being set up',
        type: 'confirmation'
      }
    ]
  },


  /**
   * Software House ERP Signup Flow (4 steps)
   */
  software_house: {
    steps: [
      {
        id: 1,
        title: 'Create Your Account',
        subtitle: 'Start your free trial - no credit card required',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true, hint: 'We\'ll send a verification code to this email' },
          { name: 'password', label: 'Password', type: 'password', required: true, minlength: 12, showStrength: true, hint: 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true }
        ]
      },
      {
        id: 2,
        title: 'Verify Your Email',
        subtitle: 'We sent a 6-digit code to your email',
        fields: [
          { name: 'otp', label: 'Verification Code', type: 'otp', required: true, length: 6 }
        ]
      },
      {
        id: 3,
        title: 'Software Company Details',
        subtitle: 'Tell us about your software house',
        fields: [
          { name: 'companyName', label: 'Company Name', type: 'text', required: true },
          { name: 'teamSize', label: 'Team Size', type: 'select', required: false, options: [
            { value: '1-5', label: '1-5 developers' },
            { value: '6-15', label: '6-15 developers' },
            { value: '16-50', label: '16-50 developers' },
            { value: '50+', label: '50+ developers' }
          ]},
          { name: 'primaryTechStack', label: 'Primary Tech Stack', type: 'select', required: false, options: [
            { value: 'javascript', label: 'JavaScript/Node.js' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'dotnet', label: '.NET' },
            { value: 'php', label: 'PHP' },
            { value: 'ruby', label: 'Ruby' },
            { value: 'go', label: 'Go' },
            { value: 'other', label: 'Other' }
          ]},
          { name: 'methodology', label: 'Development Methodology', type: 'select', required: false, options: [
            { value: 'agile', label: 'Agile' },
            { value: 'scrum', label: 'Scrum' },
            { value: 'kanban', label: 'Kanban' },
            { value: 'waterfall', label: 'Waterfall' },
            { value: 'hybrid', label: 'Hybrid' }
          ]},
          { name: 'slug', label: 'Tenant Subdomain', type: 'slug', required: true, hint: '3-50 characters, lowercase letters, numbers, and hyphens only', checkAvailability: true },
          { name: 'industry', label: 'Industry', type: 'hidden', value: 'software_house' }
        ]
      },
      {
        id: 4,
        title: 'Welcome!',
        subtitle: 'Your software house ERP is being set up',
        type: 'confirmation'
      }
    ]
  },

  /**
   * Generic Business ERP Signup Flow (3 steps - minimal)
   */
  business: {
    steps: [
      {
        id: 1,
        title: 'Create Your Account',
        subtitle: 'Start your free trial - no credit card required',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true, hint: 'We\'ll send a verification code to this email' },
          { name: 'password', label: 'Password', type: 'password', required: true, minlength: 12, showStrength: true, hint: 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true }
        ]
      },
      {
        id: 2,
        title: 'Verify Your Email',
        subtitle: 'We sent a 6-digit code to your email',
        fields: [
          { name: 'otp', label: 'Verification Code', type: 'otp', required: true, length: 6 }
        ]
      },
      {
        id: 3,
        title: 'Organization Setup',
        subtitle: 'Set up your organization',
        fields: [
          { name: 'organizationName', label: 'Organization Name', type: 'text', required: true },
          { name: 'slug', label: 'Tenant Subdomain', type: 'slug', required: true, hint: '3-50 characters, lowercase letters, numbers, and hyphens only', checkAvailability: true },
          { name: 'industry', label: 'Industry', type: 'hidden', value: 'business' }
        ]
      }
    ]
  },

  /**
   * Warehouse ERP Signup Flow (4 steps)
   */
  warehouse: {
    steps: [
      {
        id: 1,
        title: 'Create Your Account',
        subtitle: 'Start your free trial - no credit card required',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true, hint: 'We\'ll send a verification code to this email' },
          { name: 'password', label: 'Password', type: 'password', required: true, minlength: 12, showStrength: true, hint: 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true }
        ]
      },
      {
        id: 2,
        title: 'Verify Your Email',
        subtitle: 'We sent a 6-digit code to your email',
        fields: [
          { name: 'otp', label: 'Verification Code', type: 'otp', required: true, length: 6 }
        ]
      },
      {
        id: 3,
        title: 'Warehouse Details',
        subtitle: 'Tell us about your warehouse operation',
        fields: [
          { name: 'warehouseName', label: 'Warehouse/Company Name', type: 'text', required: true },
          { name: 'warehouseType', label: 'Warehouse Type', type: 'select', required: false, options: [
            { value: 'distribution', label: 'Distribution Center' },
            { value: 'fulfillment', label: 'Fulfillment Center' },
            { value: 'cold_storage', label: 'Cold Storage' }
          ]},
          { name: 'squareFootage', label: 'Square Footage', type: 'number', required: false, hint: 'Approximate warehouse size' },
          { name: 'slug', label: 'Tenant Subdomain', type: 'slug', required: true, hint: '3-50 characters, lowercase letters, numbers, and hyphens only', checkAvailability: true },
          { name: 'industry', label: 'Industry', type: 'hidden', value: 'warehouse' }
        ]
      },
      {
        id: 4,
        title: 'Welcome!',
        subtitle: 'Your warehouse ERP is being set up',
        type: 'confirmation'
      }
    ]
  }
};

// Export for use in signup modal
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignupFlows;
} else {
  window.SignupFlows = SignupFlows;
}
