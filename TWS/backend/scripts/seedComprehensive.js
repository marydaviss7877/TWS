/**
 * Comprehensive Data Seeding Script for SRS Chapter 5 UI Screenshots
 * Organization: Subhan@gmail.com (NexaCore Technologies)
 *
 * Run: node scripts/seedComprehensive.js
 *
 * This script finds the existing tenant for Subhan@gmail.com and populates
 * ALL modules with realistic dummy data:
 *  - Departments
 *  - Employees (Users + TenantUsers + Employee records)
 *  - Clients
 *  - Projects (with sprints, milestones, tasks)
 *  - Finance (chart of accounts, journal entries, expenses)
 *  - Attendance records (30 days history)
 *  - Documents (org documents with folder structure)
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Model Imports ────────────────────────────────────────────────────────────
const Tenant        = require('../src/models/Tenant');
const Organization  = require('../src/models/Organization');
const User          = require('../src/models/User');
const TenantUser    = require('../src/models/TenantUser');
const Employee      = require('../src/models/Employee');
const Department    = require('../src/models/Department');
const Client        = require('../src/models/Client');
const Project       = require('../src/models/Project');
const Sprint        = require('../src/models/Sprint');
const Milestone     = require('../src/models/Milestone');
const Task          = require('../src/models/Task');
const Attendance    = require('../src/models/Attendance');
const Expense       = require('../src/models/Expense');
const OrgDocument   = require('../src/models/OrgDocument');
const DocumentFolder = require('../src/models/DocumentFolder');
const { Account, JournalEntry } = require('../src/models/Finance');
const { PayrollRule } = require('../src/models/Payroll');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Main Seed ────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── 1. Find existing Tenant & Org for Subhan@gmail.com ─────────────────────
  let tenant = await Tenant.findOne({ 'contactInfo.email': 'subhan@gmail.com' });
  if (!tenant) {
    // Try case-insensitive
    tenant = await Tenant.findOne({
      'contactInfo.email': { $regex: /^subhan@gmail\.com$/i }
    });
  }

  if (!tenant) {
    console.log('❌ No tenant found for subhan@gmail.com. Creating one...');
    tenant = await Tenant.create({
      name: 'NexaCore Technologies',
      slug: 'nexacore-technologies',
      description: 'A forward-thinking software house delivering world-class digital solutions.',
      contactInfo: {
        email: 'subhan@gmail.com',
        phone: '+92-321-4567890',
        website: 'https://nexacore.io',
        address: {
          street: '14-B, Gulberg III',
          city: 'Lahore',
          state: 'Punjab',
          zipCode: '54000',
          country: 'PK'
        }
      },
      businessInfo: {
        industry: 'Information Technology',
        companySize: '11-50',
        taxId: 'NTN-1234567',
        registrationNumber: 'SECP-2021-00789'
      },
      erpCategory: 'software_house',
      status: 'active',
      subscription: { status: 'active', plan: 'professional' }
    });
    console.log(`  Created tenant: ${tenant.name}`);
  } else {
    console.log(`✅ Found tenant: ${tenant.name} (${tenant._id})`);
  }

  // ── 2. Find or create Organization linked to this tenant ───────────────────
  let org = await Organization.findOne({ tenantId: tenant._id });
  if (!org) {
    org = await Organization.findOne({ slug: tenant.slug });
  }
  if (!org) {
    org = await Organization.create({
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      industry: 'Technology',
      size: '11-50',
      plan: 'professional',
      status: 'active',
      tenantId: tenant._id,
      contactEmail: 'subhan@gmail.com',
      contactPhone: '+92-321-4567890',
      website: 'https://nexacore.io',
      address: {
        street: '14-B, Gulberg III',
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan'
      }
    });
    console.log(`  Created org: ${org.name}`);
  } else {
    console.log(`✅ Found org: ${org.name} (${org._id})`);
  }

  const orgId    = org._id;
  const tenantId = tenant._id;

  // ── 3. Find the owner user (Subhan) ────────────────────────────────────────
  let ownerUser = await User.findOne({ email: 'subhan@gmail.com' });
  if (!ownerUser) {
    ownerUser = await User.findOne({
      email: { $regex: /^subhan@gmail\.com$/i }
    });
  }
  if (!ownerUser) {
    const hash = await bcrypt.hash('Admin@123', 10);
    ownerUser = await User.create({
      email: 'subhan@gmail.com',
      password: hash,
      fullName: 'Subhan Malik',
      role: 'owner',
      status: 'active',
      orgId
    });
    console.log('  Created owner user: Subhan Malik');
  } else {
    // Make sure orgId is set
    if (!ownerUser.orgId) {
      ownerUser.orgId = orgId;
      await ownerUser.save();
    }
    console.log(`✅ Found owner user: ${ownerUser.fullName}`);
  }

  // ── 4. Departments ─────────────────────────────────────────────────────────
  console.log('\n📁 Creating Departments...');
  const deptDefs = [
    { name: 'Engineering',       code: 'ENG',  color: '#1677ff', description: 'Software development and architecture',           moduleKey: 'projects'  },
    { name: 'Human Resources',   code: 'HR',   color: '#52c41a', description: 'Talent acquisition and employee management',      moduleKey: 'hr'        },
    { name: 'Finance',           code: 'FIN',  color: '#faad14', description: 'Financial planning, accounting and reporting',    moduleKey: 'finance'   },
    { name: 'Design & UX',       code: 'DES',  color: '#eb2f96', description: 'UI/UX design and brand identity',                moduleKey: 'projects'  },
    { name: 'Quality Assurance', code: 'QA',   color: '#722ed1', description: 'Testing, QA processes and release management',   moduleKey: 'projects'  },
    { name: 'Business Dev',      code: 'BD',   color: '#13c2c2', description: 'Sales, business development and client relations',moduleKey: 'clients'   },
    { name: 'DevOps',            code: 'OPS',  color: '#fa8c16', description: 'Infrastructure, CI/CD and cloud operations',     moduleKey: 'projects'  },
  ];

  const departments = {};
  for (const def of deptDefs) {
    let dept = await Department.findOne({ code: def.code, tenantId });
    if (!dept) {
      dept = await Department.create({
        ...def,
        tenantId,
        orgId,
        status: 'active',
        settings: { allowExternalAccess: false, requireApproval: false, maxUsers: 50 }
      });
    }
    departments[def.code] = dept;
    console.log(`  ✔ ${def.name}`);
  }

  // ── 5. Employees (Users + TenantUsers + Employee records) ──────────────────
  console.log('\n👥 Creating Employees...');

  const password = await bcrypt.hash('Pass@1234', 10);

  const staffDefs = [
    // Engineering
    { fullName: 'Ali Hassan',      email: 'ali.hassan@nexacore.io',    role: 'developer',       dept: 'ENG', jobTitle: 'Senior Full-Stack Developer', salary: 180000, empId: 'NCT-001' },
    { fullName: 'Fatima Zahra',    email: 'fatima.zahra@nexacore.io',  role: 'developer',       dept: 'ENG', jobTitle: 'React Developer',             salary: 140000, empId: 'NCT-002' },
    { fullName: 'Usman Tariq',     email: 'usman.tariq@nexacore.io',   role: 'developer',       dept: 'ENG', jobTitle: 'Backend Developer (Node.js)',  salary: 150000, empId: 'NCT-003' },
    { fullName: 'Zara Sheikh',     email: 'zara.sheikh@nexacore.io',   role: 'developer',       dept: 'ENG', jobTitle: 'Mobile App Developer',        salary: 135000, empId: 'NCT-004' },
    // HR
    { fullName: 'Nadia Iqbal',     email: 'nadia.iqbal@nexacore.io',   role: 'hr',              dept: 'HR',  jobTitle: 'HR Manager',                  salary: 120000, empId: 'NCT-005' },
    { fullName: 'Hamza Rauf',      email: 'hamza.rauf@nexacore.io',    role: 'hr',              dept: 'HR',  jobTitle: 'Recruitment Specialist',       salary: 90000,  empId: 'NCT-006' },
    // Finance
    { fullName: 'Bilal Chaudhry', email: 'bilal.chaudhry@nexacore.io', role: 'finance',         dept: 'FIN', jobTitle: 'Finance Manager',             salary: 130000, empId: 'NCT-007' },
    { fullName: 'Sara Anwar',      email: 'sara.anwar@nexacore.io',    role: 'finance',         dept: 'FIN', jobTitle: 'Accountant',                  salary: 95000,  empId: 'NCT-008' },
    // Design
    { fullName: 'Maham Butt',      email: 'maham.butt@nexacore.io',    role: 'employee',        dept: 'DES', jobTitle: 'Senior UI/UX Designer',       salary: 125000, empId: 'NCT-009' },
    { fullName: 'Raza Hussain',    email: 'raza.hussain@nexacore.io',  role: 'employee',        dept: 'DES', jobTitle: 'Graphic Designer',             salary: 85000,  empId: 'NCT-010' },
    // QA
    { fullName: 'Sana Mirza',      email: 'sana.mirza@nexacore.io',    role: 'employee',        dept: 'QA',  jobTitle: 'QA Lead',                     salary: 110000, empId: 'NCT-011' },
    { fullName: 'Tariq Mahmood',   email: 'tariq.mahmood@nexacore.io', role: 'employee',        dept: 'QA',  jobTitle: 'QA Engineer',                 salary: 80000,  empId: 'NCT-012' },
    // Business Dev
    { fullName: 'Ahmed Siddiqui',  email: 'ahmed.siddiqui@nexacore.io',role: 'manager',        dept: 'BD',  jobTitle: 'Business Development Manager', salary: 145000, empId: 'NCT-013' },
    // DevOps
    { fullName: 'Faisal Khan',     email: 'faisal.khan@nexacore.io',   role: 'developer',       dept: 'OPS', jobTitle: 'DevOps Engineer',             salary: 155000, empId: 'NCT-014' },
    // Project Manager
    { fullName: 'Imran Ashraf',    email: 'imran.ashraf@nexacore.io',  role: 'project_manager', dept: 'ENG', jobTitle: 'Project Manager',             salary: 160000, empId: 'NCT-015' },
  ];

  const hireDates = [
    new Date('2022-03-01'), new Date('2022-05-15'), new Date('2022-08-01'),
    new Date('2023-01-10'), new Date('2023-03-20'), new Date('2023-06-01'),
    new Date('2023-09-15'), new Date('2024-01-08'), new Date('2024-02-20'),
    new Date('2024-04-01'), new Date('2024-05-13'), new Date('2024-07-01'),
    new Date('2024-09-02'), new Date('2025-01-15'), new Date('2025-03-10'),
  ];

  const createdUsers = {};  // empId -> User doc
  const createdEmployees = {}; // empId -> Employee doc

  for (let i = 0; i < staffDefs.length; i++) {
    const def = staffDefs[i];

    // User
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = await User.create({
        email: def.email,
        password,
        fullName: def.fullName,
        role: def.role,
        status: 'active',
        orgId,
        phone: `+92-300-${1000000 + i}`
      });
    }
    createdUsers[def.empId] = user;

    // TenantUser link
    const existingTU = await TenantUser.findOne({ userId: user._id, tenantId });
    if (!existingTU) {
      await TenantUser.create({
        userId: user._id,
        tenantId,
        roles: [{ role: def.role === 'hr' ? 'hr' : def.role === 'finance' ? 'employee' : def.role === 'project_manager' ? 'project_manager' : def.role === 'manager' ? 'manager' : 'employee' }],
        status: 'active',
        tenantSpecificInfo: {
          employeeId: def.empId,
          department: departments[def.dept]?.name,
          jobTitle: def.jobTitle,
          hireDate: hireDates[i],
          salary: def.salary
        }
      });
    }

    // Employee record
    let emp = await Employee.findOne({ employeeId: def.empId });
    if (!emp) {
      emp = await Employee.create({
        userId: user._id,
        employeeId: def.empId,
        orgId,
        organizationId: orgId,
        jobTitle: def.jobTitle,
        department: departments[def.dept]?.name || def.dept,
        hireDate: hireDates[i],
        contractType: 'full-time',
        salary: {
          base: def.salary,
          currency: 'PKR',
          payFrequency: 'monthly',
          components: [
            { name: 'Base Salary', amount: def.salary, type: 'allowance', isRecurring: true },
            { name: 'House Rent Allowance', amount: Math.round(def.salary * 0.2), type: 'allowance', isRecurring: true },
            { name: 'Medical Allowance', amount: 5000, type: 'allowance', isRecurring: true },
            { name: 'Transport Allowance', amount: 3000, type: 'allowance', isRecurring: true },
          ],
          totalCompensation: Math.round(def.salary * 1.23)
        },
        bankDetails: {
          bankName: rand(['HBL', 'MCB', 'UBL', 'Meezan Bank', 'Allied Bank']),
          accountType: 'checking'
        }
      });
    }
    createdEmployees[def.empId] = emp;
    console.log(`  ✔ ${def.fullName} (${def.empId})`);
  }

  // Set department heads
  await Department.findByIdAndUpdate(departments['ENG']._id, { departmentHead: createdUsers['NCT-015']._id });
  await Department.findByIdAndUpdate(departments['HR']._id,  { departmentHead: createdUsers['NCT-005']._id });
  await Department.findByIdAndUpdate(departments['FIN']._id, { departmentHead: createdUsers['NCT-007']._id });
  await Department.findByIdAndUpdate(departments['DES']._id, { departmentHead: createdUsers['NCT-009']._id });
  await Department.findByIdAndUpdate(departments['QA']._id,  { departmentHead: createdUsers['NCT-011']._id });
  await Department.findByIdAndUpdate(departments['BD']._id,  { departmentHead: createdUsers['NCT-013']._id });
  await Department.findByIdAndUpdate(departments['OPS']._id, { departmentHead: createdUsers['NCT-014']._id });

  // ── 6. Clients ─────────────────────────────────────────────────────────────
  console.log('\n🏢 Creating Clients...');

  const clientDefs = [
    {
      name: 'RetailEdge Inc.',
      type: 'company',
      contact: { primary: { name: 'James Carter', email: 'james.carter@retailedge.com', phone: '+1-555-0101', title: 'CTO' } },
      company: { name: 'RetailEdge Inc.', website: 'https://retailedge.com', industry: 'Retail Technology', size: '201-500' },
      address: { city: 'New York', state: 'NY', country: 'US' },
      billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 8.5 },
      status: 'active',
      health: { score: 92, status: 'healthy' }
    },
    {
      name: 'FinTech Solutions Ltd.',
      type: 'company',
      contact: { primary: { name: 'Sarah Thompson', email: 'sarah@fintechsolutions.io', phone: '+44-20-7946-0200', title: 'CEO' } },
      company: { name: 'FinTech Solutions Ltd.', website: 'https://fintechsolutions.io', industry: 'Financial Services', size: '51-200' },
      address: { city: 'London', country: 'UK' },
      billing: { currency: 'GBP', paymentTerms: 'net_45', taxRate: 20 },
      status: 'active',
      health: { score: 87, status: 'healthy' }
    },
    {
      name: 'HealthBridge Systems',
      type: 'company',
      contact: { primary: { name: 'Dr. Michael Nguyen', email: 'm.nguyen@healthbridge.com', phone: '+1-310-555-0182', title: 'CIO' } },
      address: { city: 'Los Angeles', state: 'CA', country: 'US' },
      billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 9.5 },
      status: 'active',
      health: { score: 78, status: 'at_risk' }
    },
    {
      name: 'EduLearn Platform',
      type: 'company',
      contact: { primary: { name: 'Lisa Anderson', email: 'lisa@edulearn.com', phone: '+1-415-555-0145', title: 'Product Director' } },
      company: { name: 'EduLearn Platform', website: 'https://edulearn.com', industry: 'EdTech', size: '11-50' },
      address: { city: 'San Francisco', state: 'CA', country: 'US' },
      billing: { currency: 'USD', paymentTerms: 'net_15', taxRate: 8.0 },
      status: 'active',
      health: { score: 95, status: 'healthy' }
    },
    {
      name: 'LogiTrack Corp',
      type: 'company',
      contact: { primary: { name: 'Ahmed Al-Rashid', email: 'ahmed@logitrack.ae', phone: '+971-4-555-0123', title: 'VP Technology' } },
      company: { name: 'LogiTrack Corp', website: 'https://logitrack.ae', industry: 'Logistics & Supply Chain', size: '201-500' },
      address: { city: 'Dubai', country: 'UAE' },
      billing: { currency: 'AED', paymentTerms: 'net_30', taxRate: 5 },
      status: 'active',
      health: { score: 82, status: 'healthy' }
    },
  ];

  const createdClients = [];
  for (const def of clientDefs) {
    let client = await Client.findOne({ orgId, name: def.name });
    if (!client) {
      client = await Client.create({
        orgId,
        name: def.name,
        slug: slugify(def.name),
        ...def
      });
    }
    createdClients.push(client);
    console.log(`  ✔ ${def.name}`);
  }

  // ── 7. Projects ─────────────────────────────────────────────────────────────
  console.log('\n🚀 Creating Projects...');

  const projectDefs = [
    {
      name: 'RetailEdge E-Commerce Platform',
      clientIdx: 0,
      projectType: 'web_application',
      methodology: 'scrum',
      status: 'active',
      techStack: { frontend: ['React', 'TypeScript', 'TailwindCSS'], backend: ['Node.js', 'Express', 'MongoDB'], devops: ['AWS', 'Docker', 'GitHub Actions'], other: ['Stripe', 'Elasticsearch'] },
      budget: { total: 2400000, spent: 1680000, currency: 'PKR' },
      startDate: daysAgo(120),
      endDate: daysFromNow(60),
      description: 'A full-featured B2C e-commerce platform with inventory management, analytics dashboard, and mobile app integration.',
      priority: 'high',
      dept: 'ENG',
      pm: 'NCT-015',
    },
    {
      name: 'FinTech Mobile Banking App',
      clientIdx: 1,
      projectType: 'mobile_app',
      methodology: 'agile',
      status: 'active',
      techStack: { frontend: ['React Native', 'Expo'], backend: ['Node.js', 'PostgreSQL'], devops: ['Azure', 'Kubernetes'], other: ['Plaid API', 'Twilio'] },
      budget: { total: 3200000, spent: 1100000, currency: 'PKR' },
      startDate: daysAgo(60),
      endDate: daysFromNow(120),
      description: 'A secure mobile banking application with biometric authentication, real-time notifications, and AI-powered fraud detection.',
      priority: 'urgent',
      dept: 'ENG',
      pm: 'NCT-015',
    },
    {
      name: 'HealthBridge Customer Portal',
      clientIdx: 2,
      projectType: 'web_application',
      methodology: 'waterfall',
      status: 'active',
      techStack: { frontend: ['Vue.js', 'Vuetify'], backend: ['Python', 'Django', 'PostgreSQL'], devops: ['GCP', 'Docker'], other: ['HL7 FHIR', 'Twilio'] },
      budget: { total: 1800000, spent: 900000, currency: 'PKR' },
      startDate: daysAgo(90),
      endDate: daysFromNow(90),
      description: 'compliance-ready customer portal with appointment scheduling and account management.',
      priority: 'high',
      dept: 'ENG',
      pm: 'NCT-015',
    },
    {
      name: 'EduLearn LMS Revamp',
      clientIdx: 3,
      projectType: 'web_application',
      methodology: 'kanban',
      status: 'active',
      techStack: { frontend: ['Next.js', 'Chakra UI'], backend: ['Node.js', 'GraphQL', 'MongoDB'], devops: ['Vercel', 'AWS S3'], other: ['Zoom SDK', 'Stripe'] },
      budget: { total: 950000, spent: 320000, currency: 'PKR' },
      startDate: daysAgo(45),
      endDate: daysFromNow(135),
      description: 'Complete overhaul of the LMS with interactive course builder, live streaming, AI-driven recommendations and gamification.',
      priority: 'medium',
      dept: 'ENG',
      pm: 'NCT-015',
    },
    {
      name: 'LogiTrack Supply Chain Dashboard',
      clientIdx: 4,
      projectType: 'web_application',
      methodology: 'agile',
      status: 'completed',
      techStack: { frontend: ['Angular', 'Material UI'], backend: ['Java', 'Spring Boot', 'MySQL'], devops: ['AWS', 'Jenkins'], other: ['Google Maps API', 'Apache Kafka'] },
      budget: { total: 1600000, spent: 1600000, currency: 'PKR' },
      startDate: daysAgo(210),
      endDate: daysAgo(30),
      description: 'Real-time supply chain visibility dashboard with route optimization, predictive analytics, and IoT device integration.',
      priority: 'high',
      dept: 'ENG',
      pm: 'NCT-015',
    },
    {
      name: 'Internal ERP Enhancement',
      clientIdx: -1, // internal
      projectType: 'system_integration',
      methodology: 'agile',
      status: 'active',
      techStack: { frontend: ['React'], backend: ['Node.js', 'MongoDB'], devops: ['Railway', 'GitHub Actions'], other: [] },
      budget: { total: 500000, spent: 180000, currency: 'PKR' },
      startDate: daysAgo(30),
      endDate: daysFromNow(90),
      description: 'Internal project to enhance our own ERP system with advanced reporting, AI payroll, and department-level access controls.',
      priority: 'medium',
      dept: 'ENG',
      pm: 'NCT-015',
    },
  ];

  const createdProjects = [];
  for (const def of projectDefs) {
    let proj = await Project.findOne({ orgId, name: def.name });
    if (!proj) {
      const slugBase = slugify(def.name);
      proj = await Project.create({
        orgId,
        name: def.name,
        slug: `${slugBase}-${Date.now()}`.slice(0, 80),
        description: def.description,
        projectType: def.projectType,
        methodology: def.methodology,
        status: def.status,
        priority: def.priority,
        primaryDepartmentId: departments[def.dept]._id,
        departments: [departments[def.dept]._id],
        clientId: def.clientIdx >= 0 ? createdClients[def.clientIdx]._id : undefined,
        techStack: def.techStack,
        budget: def.budget,
        timeline: { startDate: def.startDate, endDate: def.endDate },
        startDate: def.startDate,
        endDate: def.endDate,
        team: {
          projectManager: createdUsers[def.pm]._id,
          members: Object.values(createdUsers).slice(0, 5).map(u => u._id)
        },
        settings: { isPublic: false, allowClientAccess: def.clientIdx >= 0, requireTimeTracking: true },
        metrics: {
          totalTasks: 0, completedTasks: 0,
          totalHours: randInt(200, 800), billableHours: randInt(150, 600),
          completionPercentage: def.status === 'completed' ? 100 : randInt(25, 75)
        }
      });
    }
    createdProjects.push(proj);
    console.log(`  ✔ ${def.name}`);
  }

  // ── 8. Sprints ──────────────────────────────────────────────────────────────
  console.log('\n🏃 Creating Sprints...');

  const sprintProject = createdProjects[0]; // RetailEdge
  const sprintDefs = [
    { name: 'Sprint 1 – Foundation', sprintNumber: 1, startDate: daysAgo(90), endDate: daysAgo(76), status: 'completed', goal: 'Project setup, architecture design, auth module', totalSP: 34, completedSP: 32 },
    { name: 'Sprint 2 – Core Modules', sprintNumber: 2, startDate: daysAgo(75), endDate: daysAgo(61), status: 'completed', goal: 'Product catalog, cart, and checkout flow', totalSP: 40, completedSP: 38 },
    { name: 'Sprint 3 – Payments & Orders', sprintNumber: 3, startDate: daysAgo(60), endDate: daysAgo(46), status: 'completed', goal: 'Stripe integration, order management, email notifications', totalSP: 36, completedSP: 36 },
    { name: 'Sprint 4 – Admin Dashboard', sprintNumber: 4, startDate: daysAgo(45), endDate: daysAgo(31), status: 'completed', goal: 'Admin panel, analytics dashboard, inventory module', totalSP: 42, completedSP: 40 },
    { name: 'Sprint 5 – Performance & Testing', sprintNumber: 5, startDate: daysAgo(30), endDate: daysAgo(16), status: 'completed', goal: 'Performance optimization, E2E testing, security audit', totalSP: 28, completedSP: 25 },
    { name: 'Sprint 6 – Mobile & PWA', sprintNumber: 6, startDate: daysAgo(15), endDate: daysFromNow(0), status: 'active', goal: 'Progressive web app, mobile responsiveness, push notifications', totalSP: 38, completedSP: 20 },
    { name: 'Sprint 7 – Launch Prep', sprintNumber: 7, startDate: daysFromNow(1), endDate: daysFromNow(15), status: 'planning', goal: 'Final QA, UAT, deployment pipeline, go-live checklist', totalSP: 22, completedSP: 0 },
  ];

  const createdSprints = [];
  for (const def of sprintDefs) {
    let sprint = await Sprint.findOne({ projectId: sprintProject._id, sprintNumber: def.sprintNumber });
    if (!sprint) {
      sprint = await Sprint.create({
        projectId: sprintProject._id,
        orgId,
        name: def.name,
        sprintNumber: def.sprintNumber,
        description: def.goal,
        startDate: def.startDate,
        endDate: def.endDate,
        duration: 14,
        status: def.status,
        goal: def.goal,
        capacity: {
          totalStoryPoints: def.totalSP,
          committedStoryPoints: def.totalSP,
          completedStoryPoints: def.completedSP,
          teamCapacity: def.totalSP * 4,
          actualHours: def.completedSP * 4
        },
        metrics: { velocity: def.completedSP },
        createdBy: createdUsers['NCT-015']._id
      });
    }
    createdSprints.push(sprint);
    console.log(`  ✔ ${def.name}`);
  }

  // ── 9. Milestones ───────────────────────────────────────────────────────────
  console.log('\n🎯 Creating Milestones...');

  const milestoneDefs = [
    { title: 'Architecture Sign-off',       projectIdx: 0, status: 'completed', dueDate: daysAgo(100), completedDate: daysAgo(102), progress: 100, owner: 'NCT-015' },
    { title: 'Alpha Release (Internal)',     projectIdx: 0, status: 'completed', dueDate: daysAgo(60),  completedDate: daysAgo(58),  progress: 100, owner: 'NCT-015' },
    { title: 'Beta Release (Client UAT)',    projectIdx: 0, status: 'completed', dueDate: daysAgo(30),  completedDate: daysAgo(28),  progress: 100, owner: 'NCT-015' },
    { title: 'Production Go-Live',           projectIdx: 0, status: 'in_progress', dueDate: daysFromNow(30), progress: 65, owner: 'NCT-015' },
    { title: 'Regulatory Compliance Review', projectIdx: 1, status: 'in_progress', dueDate: daysFromNow(45), progress: 40, owner: 'NCT-015' },
    { title: 'Security Penetration Test',    projectIdx: 1, status: 'pending',    dueDate: daysFromNow(60), progress: 0, owner: 'NCT-015' },
    { title: 'Compliance Certification',projectIdx: 2, status: 'in_progress', dueDate: daysFromNow(30), progress: 55, owner: 'NCT-015' },
    { title: 'Phase 1: Course Builder Live', projectIdx: 3, status: 'in_progress', dueDate: daysFromNow(21), progress: 70, owner: 'NCT-015' },
    { title: 'Project Delivery',             projectIdx: 4, status: 'completed', dueDate: daysAgo(30), completedDate: daysAgo(30), progress: 100, owner: 'NCT-015' },
  ];

  for (const def of milestoneDefs) {
    const existing = await Milestone.findOne({ orgId, title: def.title, projectId: createdProjects[def.projectIdx]._id });
    if (!existing) {
      await Milestone.create({
        orgId,
        projectId: createdProjects[def.projectIdx]._id,
        title: def.title,
        status: def.status,
        dueDate: def.dueDate,
        completedDate: def.completedDate || null,
        progress: def.progress,
        ownerId: createdUsers[def.owner]._id,
        tasks: { total: randInt(5, 15), completed: Math.round(randInt(5, 15) * def.progress / 100) }
      });
    }
    console.log(`  ✔ ${def.title}`);
  }

  // ── 10. Tasks ───────────────────────────────────────────────────────────────
  console.log('\n✅ Creating Tasks...');

  const taskSets = [
    // RetailEdge (project 0)
    { projectIdx: 0, sprintIdx: 5, tasks: [
      { title: 'Implement PWA service worker', status: 'in_progress', priority: 'high',    assignee: 'NCT-001', storyPoints: 5, hours: 8  },
      { title: 'Build offline cart sync',      status: 'in_progress', priority: 'high',    assignee: 'NCT-002', storyPoints: 8, hours: 12 },
      { title: 'Add push notification system', status: 'todo',        priority: 'medium',  assignee: 'NCT-003', storyPoints: 5, hours: 6  },
      { title: 'Mobile responsiveness audit',  status: 'under_review',priority: 'high',    assignee: 'NCT-011', storyPoints: 3, hours: 4  },
      { title: 'Apple Pay / Google Pay integration', status: 'todo', priority: 'critical', assignee: 'NCT-001', storyPoints: 8, hours: 10 },
      { title: 'Performance benchmarking',     status: 'completed',   priority: 'medium',  assignee: 'NCT-014', storyPoints: 3, hours: 5  },
    ]},
    // FinTech (project 1)
    { projectIdx: 1, sprintIdx: -1, tasks: [
      { title: 'Biometric authentication flow',  status: 'completed',    priority: 'critical', assignee: 'NCT-001', storyPoints: 8, hours: 14 },
      { title: 'Plaid bank account linking',      status: 'in_progress',  priority: 'high',     assignee: 'NCT-003', storyPoints: 6, hours: 10 },
      { title: 'Transaction history UI',          status: 'in_progress',  priority: 'high',     assignee: 'NCT-002', storyPoints: 5, hours: 8  },
      { title: 'AI fraud detection module',       status: 'todo',         priority: 'critical', assignee: 'NCT-001', storyPoints: 13, hours: 20 },
      { title: 'Real-time balance updates',       status: 'todo',         priority: 'high',     assignee: 'NCT-003', storyPoints: 5, hours: 8  },
      { title: 'Security audit – OWASP checks',  status: 'under_review', priority: 'critical', assignee: 'NCT-011', storyPoints: 8, hours: 12 },
    ]},
    // HealthBridge (project 2)
    { projectIdx: 2, sprintIdx: -1, tasks: [
      { title: 'Customer registration flow',       status: 'completed',  priority: 'high',     assignee: 'NCT-002', storyPoints: 5, hours: 8  },
      { title: 'Appointment booking calendar',     status: 'completed',  priority: 'high',     assignee: 'NCT-002', storyPoints: 8, hours: 12 },
      { title: 'Telemedicine video integration',   status: 'in_progress',priority: 'critical', assignee: 'NCT-001', storyPoints: 13, hours: 18 },
      { title: 'Electronic health records module', status: 'in_progress',priority: 'high',     assignee: 'NCT-003', storyPoints: 8, hours: 14 },
      { title: 'HL7 FHIR data export',             status: 'todo',       priority: 'high',     assignee: 'NCT-003', storyPoints: 8, hours: 10 },
      { title: 'compliance audit log implementation',   status: 'todo',       priority: 'critical', assignee: 'NCT-014', storyPoints: 5, hours: 8  },
    ]},
    // EduLearn (project 3)
    { projectIdx: 3, sprintIdx: -1, tasks: [
      { title: 'Drag-and-drop course builder',   status: 'in_progress', priority: 'high',   assignee: 'NCT-002', storyPoints: 8,  hours: 12 },
      { title: 'Live streaming with Zoom SDK',   status: 'todo',        priority: 'high',   assignee: 'NCT-001', storyPoints: 8,  hours: 10 },
      { title: 'AI course recommendation engine',status: 'todo',        priority: 'medium', assignee: 'NCT-003', storyPoints: 13, hours: 18 },
      { title: 'Gamification – badges & XP',     status: 'in_progress', priority: 'medium', assignee: 'NCT-004', storyPoints: 5,  hours: 8  },
      { title: 'Payment gateway – Stripe',        status: 'completed',   priority: 'high',   assignee: 'NCT-001', storyPoints: 5,  hours: 6  },
    ]},
    // Internal ERP (project 5)
    { projectIdx: 5, sprintIdx: -1, tasks: [
      { title: 'Advanced analytics dashboard',      status: 'in_progress', priority: 'high',   assignee: 'NCT-002', storyPoints: 8, hours: 10 },
      { title: 'Department access control rollout', status: 'completed',   priority: 'high',   assignee: 'NCT-001', storyPoints: 5, hours: 8  },
      { title: 'AI payroll calculation engine',     status: 'todo',        priority: 'medium', assignee: 'NCT-003', storyPoints: 8, hours: 12 },
      { title: 'Document version control',          status: 'in_progress', priority: 'medium', assignee: 'NCT-004', storyPoints: 5, hours: 7  },
    ]},
  ];

  let taskSeq = 1000;
  for (const set of taskSets) {
    const project = createdProjects[set.projectIdx];
    const sprint   = set.sprintIdx >= 0 ? createdSprints[set.sprintIdx] : null;
    for (const t of set.tasks) {
      const existing = await Task.findOne({ projectId: project._id, title: t.title });
      if (!existing) {
        const dueOffset = randInt(7, 30);
        await Task.create({
          orgId,
          tenantId,
          taskId: `TASK-${taskSeq++}`,
          projectId: project._id,
          sprintId: sprint?._id,
          title: t.title,
          description: `${t.title} – implementation as per technical specification and design guidelines.`,
          status: t.status,
          priority: t.priority,
          assignee: createdUsers[t.assignee]._id,
          reporter: createdUsers['NCT-015']._id,
          storyPoints: t.storyPoints,
          estimatedHours: t.hours,
          loggedHours: t.status === 'completed' ? t.hours : t.status === 'in_progress' ? Math.round(t.hours * 0.6) : 0,
          dueDate: t.status === 'completed' ? daysAgo(randInt(1, 30)) : daysFromNow(dueOffset),
          tags: [rand(['frontend', 'backend', 'api', 'ui', 'security', 'integration', 'testing', 'devops'])],
        });
      }
    }
    console.log(`  ✔ ${project.name} – ${set.tasks.length} tasks`);
  }

  // ── 11. Finance – Chart of Accounts ────────────────────────────────────────
  console.log('\n💰 Creating Finance Data...');

  // Drop unique index issue: use findOneAndUpdate with upsert on code+orgId
  const accountDefs = [
    // Assets
    { code: '1001', name: 'Cash – HBL Current Account',      type: 'asset',     level: 1 },
    { code: '1002', name: 'Cash – Meezan Bank Account',       type: 'asset',     level: 1 },
    { code: '1100', name: 'Accounts Receivable',              type: 'asset',     level: 1 },
    { code: '1200', name: 'Prepaid Expenses',                 type: 'asset',     level: 1 },
    { code: '1300', name: 'Computer Equipment',               type: 'asset',     level: 1 },
    { code: '1301', name: 'Software Licenses',                type: 'asset',     level: 1 },
    { code: '1400', name: 'Office Furniture & Fixtures',      type: 'asset',     level: 1 },
    // Liabilities
    { code: '2001', name: 'Accounts Payable',                 type: 'liability', level: 1 },
    { code: '2100', name: 'Salaries Payable',                 type: 'liability', level: 1 },
    { code: '2200', name: 'Tax Payable (Income Tax)',         type: 'liability', level: 1 },
    { code: '2300', name: 'Advance Client Payments',          type: 'liability', level: 1 },
    // Equity
    { code: '3001', name: 'Owner\'s Capital',                 type: 'equity',    level: 1 },
    { code: '3100', name: 'Retained Earnings',                type: 'equity',    level: 1 },
    // Revenue
    { code: '4001', name: 'Project Revenue – Web Development',type: 'revenue',   level: 1 },
    { code: '4002', name: 'Project Revenue – Mobile Apps',   type: 'revenue',   level: 1 },
    { code: '4003', name: 'Consulting & Advisory Income',    type: 'revenue',   level: 1 },
    { code: '4004', name: 'Maintenance & Support Contracts', type: 'revenue',   level: 1 },
    { code: '4005', name: 'Licensing Income',                type: 'revenue',   level: 1 },
    // Expenses
    { code: '5001', name: 'Salaries & Wages',                type: 'expense',   level: 1 },
    { code: '5002', name: 'Employee Benefits',               type: 'expense',   level: 1 },
    { code: '5003', name: 'Office Rent',                     type: 'expense',   level: 1 },
    { code: '5004', name: 'Utilities (Electric, Internet)',  type: 'expense',   level: 1 },
    { code: '5005', name: 'Cloud Infrastructure (AWS/GCP)',  type: 'expense',   level: 1 },
    { code: '5006', name: 'Software Subscriptions',          type: 'expense',   level: 1 },
    { code: '5007', name: 'Marketing & Advertising',         type: 'expense',   level: 1 },
    { code: '5008', name: 'Travel & Accommodation',          type: 'expense',   level: 1 },
    { code: '5009', name: 'Training & Development',          type: 'expense',   level: 1 },
    { code: '5010', name: 'Legal & Professional Fees',       type: 'expense',   level: 1 },
  ];

  const createdAccounts = {};
  for (const def of accountDefs) {
    // Each org gets its own accounts; use orgId+code as unique key
    let acct = await Account.findOne({ orgId, code: def.code });
    if (!acct) {
      try {
        acct = await Account.create({ ...def, orgId, isActive: true });
      } catch (e) {
        // might be a global unique index — skip
        acct = await Account.findOne({ code: def.code });
      }
    }
    if (acct) createdAccounts[def.code] = acct;
  }
  console.log(`  ✔ ${Object.keys(createdAccounts).length} accounts created`);

  // Journal Entries
  const jeOwner = createdUsers['NCT-007']._id;
  const jeDefs = [
    {
      entryNumber: 'JE-2025-001',
      date: daysAgo(90),
      description: 'Advance payment received – RetailEdge E-Commerce Platform (30% milestone)',
      entries: [
        { code: '1001', debit: 720000, credit: 0,      desc: 'Cash received – HBL' },
        { code: '2300', debit: 0,      credit: 720000, desc: 'Advance from RetailEdge Inc.' },
      ]
    },
    {
      entryNumber: 'JE-2025-002',
      date: daysAgo(85),
      description: 'April salary disbursement – all departments',
      entries: [
        { code: '5001', debit: 1773000, credit: 0,       desc: 'Gross salaries expense' },
        { code: '2100', debit: 0,       credit: 1773000, desc: 'Salaries payable' },
      ]
    },
    {
      entryNumber: 'JE-2025-003',
      date: daysAgo(80),
      description: 'Salary disbursement – bank transfer to employees',
      entries: [
        { code: '2100', debit: 1773000, credit: 0,       desc: 'Salaries payable settled' },
        { code: '1001', debit: 0,       credit: 1773000, desc: 'Cash – HBL debit' },
      ]
    },
    {
      entryNumber: 'JE-2025-004',
      date: daysAgo(75),
      description: 'AWS infrastructure invoice – Q2 cloud costs',
      entries: [
        { code: '5005', debit: 145000, credit: 0,      desc: 'Cloud infrastructure expense' },
        { code: '2001', debit: 0,      credit: 145000, desc: 'Accounts payable – AWS' },
      ]
    },
    {
      entryNumber: 'JE-2025-005',
      date: daysAgo(60),
      description: 'Revenue recognition – FinTech Mobile Banking milestone 1 delivery',
      entries: [
        { code: '1100', debit: 960000, credit: 0,      desc: 'Accounts receivable – FinTech Solutions' },
        { code: '4002', debit: 0,      credit: 960000, desc: 'Project revenue recognized' },
      ]
    },
    {
      entryNumber: 'JE-2025-006',
      date: daysAgo(55),
      description: 'Office rent – Gulberg III office (3 months advance)',
      entries: [
        { code: '5003', debit: 270000, credit: 0,      desc: 'Rent expense – 3 months' },
        { code: '1002', debit: 0,      credit: 270000, desc: 'Cash – Meezan Bank debit' },
      ]
    },
    {
      entryNumber: 'JE-2025-007',
      date: daysAgo(45),
      description: 'LogiTrack project final payment received',
      entries: [
        { code: '1001', debit: 480000, credit: 0,      desc: 'Final payment – HBL received' },
        { code: '1100', debit: 0,      credit: 480000, desc: 'Accounts receivable cleared' },
      ]
    },
    {
      entryNumber: 'JE-2025-008',
      date: daysAgo(30),
      description: 'Employee training program – React & TypeScript workshop',
      entries: [
        { code: '5009', debit: 35000, credit: 0,     desc: 'Training expense' },
        { code: '1001', debit: 0,     credit: 35000, desc: 'Cash – HBL debit' },
      ]
    },
    {
      entryNumber: 'JE-2025-009',
      date: daysAgo(20),
      description: 'Software license renewals – GitHub, Figma, Jira, Slack (annual)',
      entries: [
        { code: '5006', debit: 180000, credit: 0,      desc: 'Software subscriptions expense' },
        { code: '2001', debit: 0,      credit: 180000, desc: 'Accounts payable' },
      ]
    },
    {
      entryNumber: 'JE-2025-010',
      date: daysAgo(10),
      description: 'EduLearn – milestone 1 payment received (course builder delivery)',
      entries: [
        { code: '1001', debit: 285000, credit: 0,      desc: 'Cash received' },
        { code: '4001', debit: 0,      credit: 285000, desc: 'Web dev revenue recognized' },
      ]
    },
  ];

  for (const def of jeDefs) {
    const exists = await JournalEntry.findOne({ entryNumber: def.entryNumber });
    if (!exists) {
      const resolvedEntries = def.entries.map(e => ({
        accountId: createdAccounts[e.code]?._id,
        debit: e.debit,
        credit: e.credit,
        description: e.desc
      })).filter(e => e.accountId);

      if (resolvedEntries.length === 0) continue;

      const totalDebit  = resolvedEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = resolvedEntries.reduce((s, e) => s + e.credit, 0);

      await JournalEntry.create({
        entryNumber: def.entryNumber,
        date: def.date,
        description: def.description,
        entries: resolvedEntries,
        totalDebit,
        totalCredit,
        status: 'posted',
        postedBy: jeOwner,
        postedAt: def.date,
        orgId,
      });
    }
  }
  console.log(`  ✔ ${jeDefs.length} journal entries`);

  // Expenses
  const expenseDefs = [
    { title: 'Team lunch – sprint retrospective',      amount: 8500,  category: 'food',           paymentMethod: 'cash',          userId: 'NCT-015', daysBack: 3  },
    { title: 'Uber – client meeting at Liberty Market', amount: 2200,  category: 'transportation',  paymentMethod: 'digital_wallet', userId: 'NCT-013', daysBack: 5  },
    { title: 'Adobe Creative Cloud – monthly',         amount: 12000, category: 'business',        paymentMethod: 'credit',         userId: 'NCT-009', daysBack: 7  },
    { title: 'Conference tickets – DevFest Lahore',    amount: 45000, category: 'business',       paymentMethod: 'bank_transfer',  userId: 'NCT-001', daysBack: 10 },
    { title: 'Office stationery & supplies',           amount: 6500,  category: 'business',        paymentMethod: 'cash',           userId: 'NCT-005', daysBack: 12 },
    { title: 'Domain renewal – nexacore.io (3 yrs)',   amount: 9800,  category: 'business',        paymentMethod: 'credit',         userId: 'NCT-014', daysBack: 15 },
    { title: 'Flight – Islamabad client visit',        amount: 28000, category: 'travel',          paymentMethod: 'credit',         userId: 'NCT-013', daysBack: 18 },
    { title: 'Electricity bill – June',                amount: 22000, category: 'utilities',       paymentMethod: 'bank_transfer',  userId: 'NCT-007', daysBack: 20 },
    { title: 'Internet – PTCL Fiber (monthly)',        amount: 8000,  category: 'utilities',       paymentMethod: 'bank_transfer',  userId: 'NCT-007', daysBack: 25 },
    { title: 'Employee reimbursement – Usman', amount: 15000, category: 'other',      paymentMethod: 'bank_transfer',  userId: 'NCT-003', daysBack: 28 },
    { title: 'Postman Teams subscription',             amount: 7200,  category: 'business',        paymentMethod: 'credit',         userId: 'NCT-014', daysBack: 30 },
    { title: 'Dinner – FinTech client onboarding',     amount: 18000, category: 'food',            paymentMethod: 'credit',         userId: 'NCT-013', daysBack: 35 },
  ];

  for (const def of expenseDefs) {
    const exists = await Expense.findOne({ organizationId: orgId, title: def.title });
    if (!exists) {
      await Expense.create({
        userId: createdUsers[def.userId]._id,
        organizationId: orgId,
        title: def.title,
        amount: def.amount,
        category: def.category,
        date: daysAgo(def.daysBack),
        paymentMethod: def.paymentMethod,
        status: def.daysBack > 10 ? 'approved' : 'pending',
        description: `${def.title} – business expense`,
        createdBy: createdUsers[def.userId]._id
      });
    }
  }
  console.log(`  ✔ ${expenseDefs.length} expenses`);

  // ── 12. Attendance (last 30 days for all employees) ─────────────────────────
  console.log('\n🕐 Creating Attendance Records...');

  const empList = Object.entries(createdEmployees); // [[empId, empDoc]]
  let attCount = 0;

  for (const [empId, emp] of empList) {
    const user = createdUsers[empId];
    if (!user) continue;

    for (let dBack = 30; dBack >= 1; dBack--) {
      const date = daysAgo(dBack);
      const dayOfWeek = date.getDay();
      // Skip weekends (Friday=5, Saturday=6)
      if (dayOfWeek === 5 || dayOfWeek === 6) continue;

      // 90% attendance rate
      if (Math.random() < 0.1) continue;

      const exists = await Attendance.findOne({ userId: user._id, date: { $gte: date, $lt: new Date(date.getTime() + 86400000) } });
      if (exists) continue;

      const checkInHour   = randInt(8, 10);
      const checkInMin    = randInt(0, 59);
      const checkOutHour  = randInt(17, 19);
      const checkOutMin   = randInt(0, 59);

      const checkInTime  = new Date(date); checkInTime.setHours(checkInHour, checkInMin, 0);
      const checkOutTime = new Date(date); checkOutTime.setHours(checkOutHour, checkOutMin, 0);
      const hoursWorked  = parseFloat(((checkOutTime - checkInTime) / 3600000).toFixed(2));

      try {
        await Attendance.create({
          userId: user._id,
          employeeId: emp.employeeId,
          organizationId: orgId,
          date,
          checkIn: {
            timestamp: checkInTime,
            verified: true,
            verificationMethod: 'manual',
            notes: 'System entry',
            device: `seed-device-${user._id}`
          },
          checkOut: {
            timestamp: checkOutTime,
            verified: true,
            device: `seed-device-${user._id}`
          },
          hoursWorked,
          status: hoursWorked >= 8 ? 'present' : 'half-day',
          location: 'office',
          overtime: { hours: Math.max(0, hoursWorked - 8), approved: false }
        });
        attCount++;
      } catch (e) {
        if (e.code !== 11000) throw e; // skip duplicate key errors only
      }
    }
  }
  console.log(`  ✔ ${attCount} attendance records`);

  // ── 13. Documents ───────────────────────────────────────────────────────────
  console.log('\n📄 Creating Documents...');

  // Folders
  const folderDefs = [
    { name: 'Company Policies',     description: 'HR & company-wide policy documents' },
    { name: 'Client Contracts',     description: 'Signed NDAs and service agreements' },
    { name: 'Project Documentation',description: 'Technical specs, SRS, API docs' },
    { name: 'Finance & Reports',    description: 'Financial reports, invoices, budgets' },
    { name: 'HR Documents',         description: 'Job descriptions, onboarding, appraisals' },
  ];

  const createdFolders = [];
  for (const def of folderDefs) {
    let folder = await DocumentFolder.findOne({ orgId, name: def.name });
    if (!folder) {
      folder = await DocumentFolder.create({
        orgId,
        tenantId,
        name: def.name,
        description: def.description,
        createdBy: ownerUser._id,
        color: rand(['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1']),
        isShared: false
      });
    }
    createdFolders.push(folder);
  }

  const docDefs = [
    // Company Policies
    { title: 'Employee Code of Conduct 2025',        folderIdx: 0, type: 'created', status: 'approved',   creator: 'NCT-005', tags: ['hr', 'policy'] },
    { title: 'Remote Work Policy',                   folderIdx: 0, type: 'created', status: 'approved',   creator: 'NCT-005', tags: ['hr', 'remote'] },
    { title: 'Information Security Policy v2.1',     folderIdx: 0, type: 'created', status: 'approved',   creator: 'NCT-014', tags: ['security', 'policy'] },
    { title: 'Leave & Attendance Policy',            folderIdx: 0, type: 'created', status: 'approved',   creator: 'NCT-005', tags: ['hr', 'attendance'] },
    { title: 'Travel & Expense Reimbursement Policy',folderIdx: 0, type: 'created', status: 'in_review',  creator: 'NCT-007', tags: ['finance', 'policy'] },
    // Client Contracts
    { title: 'RetailEdge – Service Agreement 2025',  folderIdx: 1, type: 'created', status: 'approved',   creator: 'NCT-013', tags: ['contract', 'client'] },
    { title: 'FinTech Solutions – NDA & MSA',        folderIdx: 1, type: 'created', status: 'approved',   creator: 'NCT-013', tags: ['nda', 'contract'] },
    { title: 'HealthBridge – Compliance Agreement',   folderIdx: 1, type: 'created', status: 'approved',   creator: 'NCT-013', tags: ['contract', 'compliance'] },
    { title: 'EduLearn – Project Scope of Work',     folderIdx: 1, type: 'created', status: 'in_review',  creator: 'NCT-013', tags: ['scope', 'contract'] },
    // Project Documentation
    { title: 'RetailEdge – System Requirements Specification', folderIdx: 2, type: 'created', status: 'approved', creator: 'NCT-015', tags: ['srs', 'technical'] },
    { title: 'FinTech App – Technical Architecture Document',  folderIdx: 2, type: 'created', status: 'approved', creator: 'NCT-001', tags: ['architecture', 'technical'] },
    { title: 'HealthBridge – API Documentation v3',            folderIdx: 2, type: 'created', status: 'approved', creator: 'NCT-003', tags: ['api', 'technical'] },
    { title: 'EduLearn – UI/UX Design System',                 folderIdx: 2, type: 'created', status: 'draft',    creator: 'NCT-009', tags: ['design', 'ui'] },
    { title: 'Deployment & DevOps Runbook',                    folderIdx: 2, type: 'created', status: 'approved', creator: 'NCT-014', tags: ['devops', 'deployment'] },
    // Finance
    { title: 'Q1 2025 Financial Report',             folderIdx: 3, type: 'created', status: 'approved', creator: 'NCT-007', tags: ['finance', 'quarterly'] },
    { title: 'FY 2024 Annual Revenue Summary',       folderIdx: 3, type: 'created', status: 'approved', creator: 'NCT-007', tags: ['finance', 'annual'] },
    { title: 'Project Budget Tracker – Q2 2025',     folderIdx: 3, type: 'created', status: 'in_review', creator: 'NCT-008', tags: ['budget', 'finance'] },
    { title: 'Invoice Template – Standard',          folderIdx: 3, type: 'created', status: 'approved', creator: 'NCT-007', tags: ['invoice', 'template'] },
    // HR Documents
    { title: 'Software Developer – Job Description', folderIdx: 4, type: 'created', status: 'approved', creator: 'NCT-005', tags: ['hr', 'recruitment'] },
    { title: 'Employee Onboarding Checklist 2025',   folderIdx: 4, type: 'created', status: 'approved', creator: 'NCT-005', tags: ['hr', 'onboarding'] },
    { title: 'Performance Review Template – Annual', folderIdx: 4, type: 'created', status: 'approved', creator: 'NCT-005', tags: ['hr', 'performance'] },
    { title: 'Salary Structure & Pay Bands 2025',    folderIdx: 4, type: 'created', status: 'draft',    creator: 'NCT-007', tags: ['hr', 'salary'] },
  ];

  for (const def of docDefs) {
    const exists = await OrgDocument.findOne({ orgId, title: def.title });
    if (!exists) {
      await OrgDocument.create({
        orgId,
        tenantId,
        title: def.title,
        type: def.type,
        status: def.status,
        folderId: createdFolders[def.folderIdx]._id,
        createdBy: createdUsers[def.creator]._id,
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: `${def.title} – document content. This is a placeholder for the actual document content which would be populated by the respective team member.` }] }
          ]
        },
        visibility: 'internal',
        version: 1,
      });
    }
  }
  console.log(`  ✔ ${docDefs.length} documents in ${folderDefs.length} folders`);

  // ── 14. Payroll Rules ───────────────────────────────────────────────────────
  console.log('\n💵 Creating Payroll Rules...');

  const payrollDefs = [
    { name: 'Income Tax (Slab – 20%)',    type: 'tax',       method: 'percentage', value: 20,   active: true },
    { name: 'EOBI Contribution',           type: 'deduction', method: 'fixed',      value: 370,  active: true },
    { name: 'EOBI Employer Contribution',  type: 'benefit',   method: 'fixed',      value: 1850, active: true },
    { name: 'Health Insurance Premium',    type: 'deduction', method: 'fixed',      value: 2500, active: true },
    { name: 'Provident Fund (8%)',         type: 'deduction', method: 'percentage', value: 8,    active: true },
    { name: 'Performance Bonus (Q2)',      type: 'bonus',     method: 'percentage', value: 10,   active: false },
    { name: 'Overtime Rate (1.5x)',        type: 'allowance', method: 'percentage', value: 150,  active: true },
  ];

  for (const def of payrollDefs) {
    const exists = await PayrollRule.findOne({ name: def.name, orgId });
    if (!exists) {
      try {
        await PayrollRule.create({
          name: def.name,
          type: def.type,
          calculation: { method: def.method, value: def.value },
          active: def.active,
          orgId
        });
      } catch (e) {
        // May not have orgId field — try without
        try {
          await PayrollRule.create({ name: def.name, type: def.type, calculation: { method: def.method, value: def.value }, active: def.active });
        } catch (_) {}
      }
    }
  }
  console.log(`  ✔ ${payrollDefs.length} payroll rules`);

  // ── Done ────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉  COMPREHENSIVE SEED COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`\nOrganization : ${tenant.name}`);
  console.log(`Tenant ID    : ${tenant._id}`);
  console.log(`Org ID       : ${org._id}`);
  console.log(`\nModules populated:`);
  console.log(`  • Departments    : ${Object.keys(departments).length}`);
  console.log(`  • Employees      : ${staffDefs.length}`);
  console.log(`  • Clients        : ${createdClients.length}`);
  console.log(`  • Projects       : ${createdProjects.length}`);
  console.log(`  • Sprints        : ${createdSprints.length}`);
  console.log(`  • Milestones     : ${milestoneDefs.length}`);
  console.log(`  • Tasks          : ${taskSets.reduce((s, t) => s + t.tasks.length, 0)}`);
  console.log(`  • Finance Accts  : ${Object.keys(createdAccounts).length}`);
  console.log(`  • Journal Entries: ${jeDefs.length}`);
  console.log(`  • Expenses       : ${expenseDefs.length}`);
  console.log(`  • Attendance     : ${attCount} records (30-day history)`);
  console.log(`  • Documents      : ${docDefs.length} docs in ${folderDefs.length} folders`);
  console.log(`  • Payroll Rules  : ${payrollDefs.length}`);
  console.log('\n✅ All data is ready. Take your SRS screenshots!\n');

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
