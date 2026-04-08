const mongoose = require('mongoose');

const tenantSettingsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // General Settings
  general: {
    organizationName: {
      type: String,
      default: ''
    },
    timezone: {
      type: String,
      default: 'Asia/Karachi'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
    },
    timeFormat: {
      type: String,
      default: '24h',
      enum: ['12h', '24h']
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'ur']
    },
    currency: {
      type: String,
      default: 'PKR',
      enum: ['PKR', 'USD', 'EUR', 'GBP']
    }
  },
  
  // Notification Settings
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    taskReminders: {
      type: Boolean,
      default: true
    },
    attendanceAlerts: {
      type: Boolean,
      default: true
    },
    feeReminders: {
      type: Boolean,
      default: true
    },
    examNotifications: {
      type: Boolean,
      default: true
    },
    announcementNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Security Settings
  security: {
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 120
    },
    passwordPolicy: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high']
    },
    requireStrongPassword: {
      type: Boolean,
      default: true
    },
    loginAlerts: {
      type: Boolean,
      default: true
    }
  },
  
  // Theme Settings
  theme: {
    name: {
      type: String,
      default: 'default',
      enum: ['default', 'light', 'dark', 'blue', 'green', 'purple', 'orange', 'red', 'custom']
    },
    colors: {
      primary: { type: String, default: '#6366F1' },
      secondary: { type: String, default: '#10B981' },
      accent: { type: String, default: '#A855F7' }
    },
    fonts: {
      heading: { type: String, default: 'Geist' },
      body: { type: String, default: 'Inter' }
    },
    customColors: {
      primary: String,
      secondary: String,
      accent: String
    }
  }
}, {
  timestamps: true
});

// Create unique index on tenantId
tenantSettingsSchema.index({ tenantId: 1 }, { unique: true });

// Static method to get or create settings for a tenant
tenantSettingsSchema.statics.getOrCreate = async function(tenantId, orgId) {
  // Handle both ObjectId and string tenantId
  const queryTenantId = typeof tenantId === 'object' ? tenantId.toString() : tenantId;
  
  console.log('🔍 TenantSettings.getOrCreate called:', { tenantId: queryTenantId, orgId: orgId?.toString() });
  
  let settings = await this.findOne({ tenantId: queryTenantId });
  
  if (!settings) {
    console.log('📝 Creating new TenantSettings record');
    settings = await this.create({
      tenantId: queryTenantId,
      orgId,
      general: {
        organizationName: ''
      }
    });
    console.log('✅ TenantSettings created:', { id: settings._id, tenantId: settings.tenantId });
  } else {
    console.log('✅ TenantSettings found:', { id: settings._id, tenantId: settings.tenantId, hasTheme: !!settings.theme });
  }
  
  return settings;
};

// Method to update general settings
tenantSettingsSchema.methods.updateGeneral = function(generalData) {
  this.general = { ...this.general, ...generalData };
  return this.save();
};

// Method to update notification settings
tenantSettingsSchema.methods.updateNotifications = function(notificationData) {
  this.notifications = { ...this.notifications, ...notificationData };
  return this.save();
};

// Method to update security settings
tenantSettingsSchema.methods.updateSecurity = function(securityData) {
  this.security = { ...this.security, ...securityData };
  return this.save();
};

// Method to update theme settings
tenantSettingsSchema.methods.updateTheme = function(themeData) {
  console.log('🔧 updateTheme called with:', JSON.stringify(themeData, null, 2));
  console.log('🔧 Current theme before update:', JSON.stringify(this.theme, null, 2));
  
  // Properly merge nested objects (colors, fonts, customColors)
  if (themeData.name !== undefined) {
    this.theme.name = themeData.name;
  }
  if (themeData.colors) {
    this.theme.colors = { ...this.theme.colors, ...themeData.colors };
  }
  if (themeData.fonts) {
    this.theme.fonts = { ...this.theme.fonts, ...themeData.fonts };
  }
  if (themeData.customColors) {
    // If customColors is an empty object, clear it; otherwise merge
    if (Object.keys(themeData.customColors).length === 0) {
      this.theme.customColors = {};
    } else {
      this.theme.customColors = { ...this.theme.customColors, ...themeData.customColors };
    }
  }
  
  console.log('🔧 Theme after update (before save):', JSON.stringify(this.theme, null, 2));
  
  return this.save().then(saved => {
    console.log('✅ Theme saved to database:', JSON.stringify(saved.theme, null, 2));
    return saved;
  });
};

const TenantSettings = mongoose.model('TenantSettings', tenantSettingsSchema);

module.exports = TenantSettings;

