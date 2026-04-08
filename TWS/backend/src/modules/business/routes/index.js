/**
 * Business Module Routes Index
 * Centralized exports for all business logic routes
 */

// Employee Management
const employees = require('./employees');

// Attendance Management
const attendance = require('./attendance');
const attendanceIntegration = require('./attendanceIntegration');

// Financial Management
const payroll = require('./payroll');
const finance = require('./finance');
const billing = require('./billing');

// Project Management
const projects = require('./projects');
const projectAccess = require('./projectAccess');
const tasks = require('./tasks');
const teams = require('./teams');
const timeTracking = require('./timeTracking');
const sprints = require('./sprints');
const developmentMetrics = require('./developmentMetrics');

// Client Management
const clients = require('./clients');
const clientPortal = require('./clientPortal');
// nucleusPM moved to erp/software-house/nucleusPM

// Nucleus Templates & Onboarding
const nucleusTemplates = require('./nucleusTemplates');

// Nucleus Analytics
const nucleusAnalytics = require('./nucleusAnalytics');

// Nucleus Batch Operations
const nucleusBatch = require('./nucleusBatch');

// Communication
// Messaging feature removed - messaging routes disabled
// const messaging = require('./messaging');
// const mobileMessaging = require('./mobileMessaging');

// Workspace Management
const boards = require('./boards');
const cards = require('./cards');
const lists = require('./lists');
const workspaces = require('./workspaces');
const templates = require('./templates');

// ERP Management
const erpManagement = require('./erpManagement');
const erpTemplates = require('./erpTemplates');
const masterERP = require('./masterERP');
// masterERPFixed removed - consolidated into masterERP

// Form Management
const formManagement = require('./formManagement');

// Resource Management
const resources = require('./resources');
const sales = require('./sales');
const partners = require('./partners');

// Software House Specific (moved to erp/software-house/)
const softwareHouseERP = require('../erp/software-house');

module.exports = {
  // Employee Management
  employees,
  
  // Attendance Management
  attendance,
  attendanceIntegration,
  softwareHouseAttendance: softwareHouseERP.attendance, // From erp/software-house
  
  // Financial Management
  payroll,
  finance,
  billing,

  // Project Management
  projects,
  projectAccess,
  tasks,
  teams,
  timeTracking,
  sprints,
  developmentMetrics,
  
  // Client Management
  clients,
  clientPortal,

  // Nucleus Templates & Onboarding
  nucleusTemplates,
  
  // Nucleus PM & Internal Team Routes
  nucleusPM: softwareHouseERP.nucleusPM, // From erp/software-house
  
  // Nucleus Analytics
  nucleusAnalytics,
  
  // Nucleus Batch Operations
  nucleusBatch,
  
  // Communication
  // messaging, // Messaging feature removed
  // mobileMessaging, // Messaging feature removed
  
  // Workspace Management
  boards,
  cards,
  lists,
  workspaces,
  templates,
  
  // ERP Management
  erpManagement,
  erpTemplates,
  masterERP,
  
  // Form Management
  formManagement,
  
  // Resource Management
  resources,
  sales,
  partners,
  
  // Software House Specific
  softwareHouseRoles: softwareHouseERP.roles // From erp/software-house
};
