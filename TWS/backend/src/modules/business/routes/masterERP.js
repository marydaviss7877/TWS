const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const masterERPService = require('../../../services/masterERPService');
const { body, validationResult } = require('express-validator');
const masterErpAdmin = requireErpAccess({ allowedRoles: ['supra_admin'], checkRevocation: false });
router.use(verifyERPToken);

// Validation middleware
const validateMasterERPCreation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('industry').isIn(['software_house', 'business', 'finance']).withMessage('Invalid industry'),
  body('description').notEmpty().withMessage('Description is required'),
  body('configuration.coreModules').isArray().withMessage('Core modules must be an array'),
  body('configuration.industryModules').isArray().withMessage('Industry modules must be an array')
];

const validateTenantCreation = [
  body('name').notEmpty().withMessage('Tenant name is required'),
  body('adminUser.email').isEmail().withMessage('Valid admin email is required'),
  body('adminUser.password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('adminUser.fullName').notEmpty().withMessage('Admin full name is required')
];

// Get all Master ERP templates - DISABLED: Master ERP management page removed
// router.get('/', masterErpAdmin, ErrorHandler.asyncHandler(async (req, res) => {
//   try {
//     const result = await masterERPService.getAllMasterERPs();
//     
//     res.json({
//       success: true,
//       data: result.data || [],
//       message: 'Master ERPs fetched successfully'
//     });
//   } catch (error) {
//     console.error('Error fetching Master ERPs:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch Master ERPs',
//       error: error.message
//     });
//   }
// }));

// Get industries metadata - DISABLED: Master ERP management page removed
// router.get('/meta/industries', masterErpAdmin, ErrorHandler.asyncHandler(async (req, res) => {
//   const industries = [
//     {
//       value: 'software_house',
//       label: 'Software House',
//       description: 'IT companies, software development firms, tech startups',
//       icon: '💻',
//       modules: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal']
//     },
//     {
//       value: 'education',
//       label: 'Education',
//       description: 'Schools, colleges, universities, educational institutions',
//       icon: '🎓',
//       modules: ['students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions']
//     },
//     {
//       value: 'healthcare',
//       label: 'Healthcare',
//       description: 'Hospitals, clinics, medical centers, healthcare providers',
//       icon: '🏥',
//       modules: ['patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing']
//     },
//     {
//       value: 'finance',
//       label: 'Finance',
//       description: 'Banks, financial institutions, investment firms',
//       icon: '🏦',
//       modules: ['accounts', 'transactions', 'loans', 'investments', 'compliance', 'reporting']
//     }
//   ];
//   
//   res.json({
//     success: true,
//     data: industries,
//     message: 'Industries fetched successfully'
//   });
// }));

// Get statistics overview - DISABLED: Master ERP management page removed
// router.get('/stats/overview', masterErpAdmin, ErrorHandler.asyncHandler(async (req, res) => {
//   try {
//     const result = await masterERPService.getMasterERPStatistics();
//     
//     res.json({
//       success: true,
//       data: result.data || {
//         totalTemplates: 0,
//         totalTenants: 0,
//         activeTenants: 0,
//         industries: [],
//         recentActivity: []
//       },
//       message: 'Statistics fetched successfully'
//     });
//   } catch (error) {
//     console.error('Error fetching Master ERP statistics:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch statistics',
//       error: error.message
//     });
//   }
// }));

// Get Master ERP by industry - KEPT: Used internally by signup service (via service method, not API route)
// This route is kept for potential future use but requires SupraAdmin auth
// Signup service uses masterERPService.getMasterERPByIndustry() directly
router.get('/industry/:industry', masterErpAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { industry } = req.params;
  
  try {
    const result = await masterERPService.getMasterERPByIndustry(industry);
    
    res.json({
      success: true,
      data: result.data,
      message: 'Master ERP fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching Master ERP by industry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Master ERP',
      error: error.message
    });
  }
}));

// Tenant creation from Master ERP removed: tenants must be created through signup pages only (see SRS).

// Clone Master ERP template - DISABLED: Master ERP management page removed
// router.post('/:id/clone', masterErpAdmin, validateMasterERPCreation, ErrorHandler.asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const templateData = req.body;
//   
//   try {
//     const result = await masterERPService.cloneMasterERP(id, templateData);
//     
//     res.status(201).json({
//       success: true,
//       data: result.data,
//       message: 'Master ERP cloned successfully'
//     });
//   } catch (error) {
//     console.error('Error cloning Master ERP:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to clone Master ERP',
//       error: error.message
//     });
//   }
// }));

// Get available modules for industry - DISABLED: Master ERP management page removed
// router.get('/meta/modules/:industry', masterErpAdmin, ErrorHandler.asyncHandler(async (req, res) => {
//   const { industry } = req.params;
//   
//   const coreModules = [
//     { value: 'hr', label: 'Human Resources', description: 'Employee management, payroll, attendance' },
//     { value: 'finance', label: 'Finance', description: 'Accounting, invoicing, financial reporting' },
//     { value: 'projects', label: 'Project Management', description: 'Project planning, task management, collaboration' },
//     { value: 'operations', label: 'Operations', description: 'Business operations, workflows, processes' },
//     { value: 'inventory', label: 'Inventory', description: 'Stock management, warehouse operations' },
//     { value: 'clients', label: 'Client Management', description: 'Customer relations, communications, support' },
//     { value: 'reports', label: 'Reports & Analytics', description: 'Business intelligence, reporting, analytics' },
//     { value: 'messaging', label: 'Messaging', description: 'Internal communication, notifications' },
//     { value: 'meetings', label: 'Meeting Management', description: 'Scheduling, video calls, collaboration' },
//     { value: 'attendance', label: 'Attendance', description: 'Time tracking, attendance management' },
//     { value: 'roles', label: 'Role Management', description: 'User roles, permissions, access control' }
//   ];
//   
//   const industryModules = {
//     education: [
//       { value: 'students', label: 'Student Management', description: 'Student records, enrollment, academic progress' },
//       { value: 'teachers', label: 'Teacher Management', description: 'Teacher profiles, schedules, performance' },
//       { value: 'classes', label: 'Class Management', description: 'Class schedules, assignments, grades' },
//       { value: 'courses', label: 'Course Management', description: 'Course catalog, curriculum, prerequisites' },
//       { value: 'exams', label: 'Exam Management', description: 'Exam scheduling, grading, results' },
//       { value: 'admissions', label: 'Admissions', description: 'Application process, enrollment, documentation' }
//     ],
//     healthcare: [
//       { value: 'patients', label: 'Patient Management', description: 'Patient records, medical history, appointments' },
//       { value: 'doctors', label: 'Doctor Management', description: 'Doctor profiles, specializations, schedules' },
//       { value: 'appointments', label: 'Appointment Management', description: 'Scheduling, reminders, cancellations' },
//       { value: 'medical_records', label: 'Medical Records', description: 'Patient history, diagnoses, treatments' },
//       { value: 'prescriptions', label: 'Prescription Management', description: 'Medication management, drug interactions' },
//       { value: 'departments', label: 'Department Management', description: 'Hospital departments, staff allocation' }
//     ],
//     finance: [
//       { value: 'accounts', label: 'Account Management', description: 'Account setup, management, monitoring' },
//       { value: 'transactions', label: 'Transaction Management', description: 'Transaction processing, recording, reconciliation' },
//       { value: 'loans', label: 'Loan Management', description: 'Loan origination, servicing, collections' },
//       { value: 'investments', label: 'Investment Management', description: 'Portfolio management, trading, analysis' },
//       { value: 'compliance', label: 'Compliance Management', description: 'Regulatory compliance, reporting, audits' },
//       { value: 'reporting', label: 'Financial Reporting', description: 'Financial statements, analytics, dashboards' }
//     ],
//     software_house: [
//       { value: 'development_methodology', label: 'Development Methodology', description: 'Agile, Scrum, Kanban methodologies' },
//       { value: 'tech_stack', label: 'Technology Stack', description: 'Programming languages, frameworks, tools' },
//       { value: 'project_types', label: 'Project Types', description: 'Web apps, mobile apps, enterprise solutions' },
//       { value: 'time_tracking', label: 'Time Tracking', description: 'Project time tracking, billing, productivity' },
//       { value: 'code_quality', label: 'Code Quality', description: 'Code reviews, testing, quality metrics' },
//       { value: 'client_portal', label: 'Client Portal', description: 'Client communication, project updates, billing' }
//     ]
//   };
//   
//   const modules = {
//     core: coreModules,
//     industry: industryModules[industry] || []
//   };
//   
//   res.json({
//     success: true,
//     data: modules,
//     message: 'Modules fetched successfully'
//   });
// }));

module.exports = router;
