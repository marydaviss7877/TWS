const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const ProjectTemplate = require('../models/ProjectTemplate');
const AttendancePolicy = require('../models/AttendancePolicy');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Department = require('../models/Department');
const Team = require('../models/Team');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const { Transaction, ChartOfAccounts, Vendor } = require('../models/Finance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const MasterERP = require('../models/MasterERP');
const Education = require('../models/Education');
const Healthcare = require('../models/Healthcare');
const mongoose = require('mongoose');
const crypto = require('crypto');

class TenantProvisioningService {
  /**
   * Automated tenant onboarding workflow
   * @param {Object} tenantData - Tenant registration data
   * @param {String} masterERPId - Optional Master ERP ID for industry-specific provisioning
   * @param {String} createdBy - Optional SupraAdmin ID who created the tenant
   * @returns {Object} Provisioning result
   */
  async provisionTenant(tenantData, masterERPId = null, createdBy = null) {
    const session = await mongoose.startSession();
    let tenant, adminUser, organization;
    
    try {
      const result = await session.withTransaction(async () => {
        // Step 1: Create tenant record
        tenant = await this.createTenantRecord(tenantData, session, createdBy);
        
        // Step 2: Create database connection
        await this.createTenantDatabase(tenant, session);
        
        // Step 3: Create default admin user
        adminUser = await this.createDefaultAdminUser(tenant, tenantData, session);
        
        // Step 4: Create default organization
        organization = await this.createDefaultOrganization(tenant, adminUser, tenantData, session);
        
        // Step 5: Seed default data (industry-specific if Master ERP provided)
        try {
          if (masterERPId) {
            await this.seedIndustrySpecificData(masterERPId, tenant, organization, session);
          } else {
            await this.seedDefaultData(tenant, organization, session);
          }
        } catch (seedError) {
          console.error('Error seeding data (non-critical):', seedError);
          // Continue even if seeding fails
        }
        
        // Step 6: Send welcome email (non-blocking)
        try {
          await this.sendWelcomeEmail(tenant, adminUser);
        } catch (emailError) {
          console.error('Error sending welcome email (non-critical):', emailError);
          // Continue even if email fails
        }
        
        // Step 7: Update onboarding status
        await this.updateOnboardingStatus(tenant, 'completed', session);
        
        return {
          tenant,
          adminUser,
          organization,
          status: 'success'
        };
      });
      
      return {
        tenant: result.tenant || tenant,
        adminUser: result.adminUser || adminUser,
        organization: result.organization || organization,
        success: true,
        message: 'Tenant provisioned successfully',
        tenantId: tenantData.tenantId
      };
      
    } catch (error) {
      console.error('Error provisioning tenant:', error);
      console.error('Error stack:', error.stack);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create tenant record
   * @param {Object} tenantData - Tenant data
   * @param {Object} session - MongoDB session
   * @param {String} createdBy - Optional SupraAdmin ID who created the tenant
   * @returns {Object} Created tenant
   */
  async createTenantRecord(tenantData, session, createdBy = null) {
    try {
      // Get industry type from tenantData
      const industryType = tenantData.erpCategory || tenantData.industry || 'business';
      
      // Automatically assign ERP modules based on industry category
      const industryModules = {
        education: ['students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions'],
        software_house: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'],
        healthcare: ['patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing'],
      };
      
      // Common modules available to all industries
      const commonModules = ['hr', 'finance', 'projects', 'operations', 'inventory', 'clients', 'reports', 'messaging', 'attendance', 'roles'];
      
      // Get industry-specific modules for the selected category
      const categoryModules = industryModules[industryType] || [];
      
      // Combine common modules with industry-specific modules
      let finalModules = tenantData.erpModules || [];
      
      if (finalModules.length === 0) {
        // Auto-assign modules: common modules + industry-specific modules
        finalModules = [...commonModules, ...categoryModules];
      } else {
        // Validate provided modules match the category
        const allowedModules = [...commonModules, ...categoryModules];
        finalModules = finalModules.filter(module => allowedModules.includes(module));
        
        // If validation removed all modules, use defaults
        if (finalModules.length === 0) {
          finalModules = [...commonModules.slice(0, 5), ...categoryModules.slice(0, 3)];
        }
      }
      
      // Remove duplicates
      finalModules = [...new Set(finalModules)];
      
      console.log(`✅ Auto-assigning ERP modules for ${industryType}: ${finalModules.join(', ')}`);
      
      // Prepare software house config if category is software_house
      let softwareHouseConfig = null;
      if (industryType === 'software_house') {
        softwareHouseConfig = {
          defaultMethodology: 'agile',
          supportedMethodologies: ['agile', 'scrum'],
          techStack: {
            frontend: [],
            backend: [],
            database: [],
            cloud: [],
            tools: []
          },
          supportedProjectTypes: ['web_application', 'mobile_app'],
          developmentSettings: {
            defaultSprintDuration: 14,
            storyPointScale: 'fibonacci',
            timeTrackingEnabled: true,
            clientPortalEnabled: true,
            codeQualityTracking: true,
            automatedTesting: false
          },
          billingConfig: {
            defaultHourlyRate: 0,
            currency: 'USD',
            billingCycle: 'monthly',
            invoiceTemplate: 'standard',
            autoInvoiceGeneration: false
          },
          teamConfig: {
            maxTeamSize: 50,
            allowRemoteWork: true,
            requireTimeTracking: true,
            allowOvertime: true,
            maxOvertimeHours: 20
          },
          qualityConfig: {
            codeReviewRequired: true,
            testingRequired: true,
            documentationRequired: true,
            minCodeCoverage: 80,
            maxTechnicalDebt: 20
          }
        };
      }
      
      // Build tenant payload - NEVER include softwareHouseConfig for non-software-house industries
      const tenantPayload = {
        tenantId: tenantData.tenantId,
        name: tenantData.companyName,
        slug: tenantData.slug,
        domain: tenantData.domain,
        status: 'active',
        erpCategory: industryType,
        erpModules: finalModules,
        subscription: {
          plan: tenantData.planId || 'trial',
          status: 'active',
          billingCycle: 'monthly',
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
        },
        settings: {
          timezone: tenantData.timezone || 'UTC',
          currency: tenantData.currency || 'USD',
          language: tenantData.language || 'en',
          dateFormat: tenantData.dateFormat || 'MM/DD/YYYY'
        },
        branding: {
          logo: tenantData.logo,
          primaryColor: tenantData.primaryColor || '#1976d2',
          secondaryColor: tenantData.secondaryColor || '#dc004e',
          companyName: tenantData.companyName
        },
        onboarding: {
          completed: false,
          steps: [
            { step: 'tenant_created', completed: true, completedAt: new Date() },
            { step: 'database_created', completed: false },
            { step: 'admin_user_created', completed: false },
            { step: 'organization_created', completed: false },
            { step: 'default_data_seeded', completed: false },
            { step: 'welcome_email_sent', completed: false }
          ]
        },
        database: {
          connectionString: this.generateConnectionString(tenantData.tenantId),
          backupFrequency: 'daily'
        },
        ownerCredentials: {
          username: tenantData.adminEmail.split('@')[0], // Use email prefix as username
          password: tenantData.adminPassword, // Will be hashed by pre-save middleware
          email: tenantData.adminEmail,
          fullName: tenantData.adminName || 'Administrator',
          isActive: true
        },
        contactInfo: {
          email: tenantData.adminEmail || tenantData.contactInfo?.email || tenantData.adminUser?.email,
          phone: tenantData.phone || tenantData.contactInfo?.phone,
          website: tenantData.website || tenantData.contactInfo?.website,
          address: tenantData.address || tenantData.contactInfo?.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          }
        },
        businessInfo: {
          industry: industryType,
          companySize: tenantData.companySize || '1-10'
        },
        createdBy: createdBy ? (typeof createdBy === 'string' ? new mongoose.Types.ObjectId(createdBy) : createdBy) : new mongoose.Types.ObjectId() // Use provided SupraAdmin ID or create mock
      };
      
      // CRITICAL: Only include softwareHouseConfig if industryType is 'software_house'
      // For all other industries, explicitly DO NOT include it (not even as null or undefined)
      if (industryType === 'software_house' && softwareHouseConfig !== null) {
        tenantPayload.softwareHouseConfig = softwareHouseConfig;
      }
      // Explicitly ensure it's not included for other industries
      if (industryType !== 'software_house') {
        // Ensure softwareHouseConfig is not in the payload at all
        delete tenantPayload.softwareHouseConfig;
      }
      
      const tenant = new Tenant(tenantPayload);

      await tenant.save({ session });
      return tenant;
      
    } catch (error) {
      console.error('Error creating tenant record:', error);
      throw error;
    }
  }

  /**
   * Create tenant database
   * @param {Object} tenant - Tenant record
   * @param {Object} session - MongoDB session
   */
  async createTenantDatabase(tenant, session) {
    try {
      // Generate unique database name
      const dbName = `tenant_${tenant.tenantId}`;
      
      // Create database connection string
      const connectionString = this.generateConnectionString(tenant.tenantId);
      
      // Update tenant with database info
      await Tenant.findByIdAndUpdate(
        tenant._id,
        {
          'database.connectionString': connectionString,
          'database.name': dbName,
          'database.status': 'active',
          'onboarding.steps.1.completed': true,
          'onboarding.steps.1.completedAt': new Date()
        },
        { session }
      );

      // Create database indexes and collections
      await this.initializeTenantDatabase(tenant.tenantId);
      
    } catch (error) {
      console.error('Error creating tenant database:', error);
      throw error;
    }
  }

  /**
   * Create default admin user
   * @param {Object} tenant - Tenant record
   * @param {Object} tenantData - Tenant data
   * @param {Object} session - MongoDB session
   * @returns {Object} Created admin user
   */
  async createDefaultAdminUser(tenant, tenantData, session) {
    try {
      // Use the password provided in tenantData, not a temporary one
      const adminPassword = tenantData.adminPassword;
      
      if (!adminPassword) {
        throw new Error('Admin password is required');
      }
      
      const adminUser = new User({
        email: tenantData.adminEmail,
        fullName: tenantData.adminName || 'Administrator',
        role: 'owner', // Set to owner for tenant admin
        status: 'active',
        tenantId: tenant.tenantId,
        password: adminPassword, // Will be hashed by pre-save middleware
        emailVerified: false,
        lastLogin: null,
        preferences: {
          theme: 'light',
          language: tenant.settings?.language || 'en',
          timezone: tenant.settings?.timezone || 'UTC',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        },
        onboarding: {
          completed: false,
          currentStep: 'welcome',
          steps: [
            { name: 'welcome', completed: false },
            { name: 'profile_setup', completed: false },
            { name: 'team_invitation', completed: false },
            { name: 'first_project', completed: false }
          ]
        }
      });

      await adminUser.save({ session });
      
      // Update tenant onboarding status
      await Tenant.findByIdAndUpdate(
        tenant._id,
        {
          'onboarding.steps.2.completed': true,
          'onboarding.steps.2.completedAt': new Date()
        },
        { session }
      );

      return adminUser;
      
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  /**
   * Create default organization
   * @param {Object} tenant - Tenant record
   * @param {Object} adminUser - Admin user
   * @param {Object} tenantData - Tenant data (for address, industry, etc.)
   * @param {Object} session - MongoDB session
   * @returns {Object} Created organization
   */
  async createDefaultOrganization(tenant, adminUser, tenantData, session) {
    try {
      // Parse address if it's a string
      let addressObj = {};
      if (tenantData.address) {
        if (typeof tenantData.address === 'string') {
          // Simple parsing - split by comma or newline
          const parts = tenantData.address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
          addressObj = {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zipCode: parts[3] || '',
            country: parts[4] || 'US'
          };
        } else {
          addressObj = tenantData.address;
        }
      }
      
      const organization = new Organization({
        name: tenant.name,
        tenantId: tenant.tenantId,
        type: 'company',
        industry: tenantData.industry || 'Technology',
        size: tenantData.companySize || 'small',
        address: {
          street: addressObj.street || '',
          city: addressObj.city || '',
          state: addressObj.state || '',
          zipCode: addressObj.zipCode || '',
          country: addressObj.country || 'US'
        },
        contact: {
          email: tenantData.adminEmail,
          phone: tenantData.phone || '',
          website: tenantData.website || ''
        },
        settings: {
          timezone: tenant.settings?.timezone || 'UTC',
          currency: tenant.settings?.currency || 'USD',
          dateFormat: tenant.settings?.dateFormat || 'MM/DD/YYYY',
          workingHours: {
            start: '09:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        },
        adminUsers: [adminUser._id],
        status: 'active'
      });

      await organization.save({ session });
      
      // Update tenant onboarding status
      await Tenant.findByIdAndUpdate(
        tenant._id,
        {
          'onboarding.steps.3.completed': true,
          'onboarding.steps.3.completedAt': new Date()
        },
        { session }
      );

      return organization;
      
    } catch (error) {
      console.error('Error creating default organization:', error);
      throw error;
    }
  }

  /**
   * Seed industry-specific data based on Master ERP
   * @param {String} masterERPId - Master ERP ID
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async seedIndustrySpecificData(masterERPId, tenant, organization, session) {
    try {
      console.log(`Starting industry-specific ERP seeding for tenant: ${tenant.tenantId}`);
      
      // Get Master ERP template
      const masterERP = await MasterERP.findById(masterERPId);
      if (!masterERP) {
        throw new Error('Master ERP template not found');
      }
      
      // Seed based on industry
      switch (masterERP.industry) {
        case 'education':
          await this.seedEducationData(tenant, organization, session);
          break;
        case 'healthcare':
          await this.seedHealthcareData(tenant, organization, session);
          break;
        case 'software_house':
          // Use existing TWS seeding logic
          await this.seedDefaultData(tenant, organization, session);
          break;
        default:
          console.log(`No specific seeding for industry: ${masterERP.industry}`);
          await this.seedDefaultData(tenant, organization, session);
      }
      
      console.log(`Industry-specific ERP seeding completed for tenant: ${tenant.tenantId}`);
      
    } catch (error) {
      console.error('Error seeding industry-specific data:', error);
      throw error;
    }
  }

  /**
   * Seed education-specific data
   */
  async seedEducationData(tenant, organization, session) {
    const currentYear = new Date().getFullYear();

    const academicYear = new Education.AcademicYear({
      orgId: organization._id,
      name: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(currentYear, 7, 1),
      endDate: new Date(currentYear + 1, 5, 30),
      status: 'active'
    });
    await academicYear.save({ session });

    const teachersData = [
      {
        teacherId: 'TCH001',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@academy.edu',
        phone: '+1-555-2010',
        subjects: ['Mathematics', 'Statistics'],
        department: 'Mathematics'
      },
      {
        teacherId: 'TCH002',
        firstName: 'Brian',
        lastName: 'Lee',
        email: 'brian.lee@academy.edu',
        phone: '+1-555-2011',
        subjects: ['Biology', 'Chemistry'],
        department: 'Science'
      }
    ];

    const teacherDocs = [];
    for (const teacher of teachersData) {
      const teacherDoc = new Education.Teacher({
        orgId: organization._id,
        ...teacher,
        hireDate: new Date(currentYear - 1, 7, 15),
        status: 'active'
      });
      await teacherDoc.save({ session });
      teacherDocs.push(teacherDoc);
    }

    const classDefinitions = [
      {
        className: 'Grade 10 - Algebra',
        classCode: 'G10-ALG',
        subject: 'Mathematics',
        schedule: { day: 'monday', startTime: '09:00', endTime: '10:30', room: 'A101' },
        teacher: teacherDocs[0]
      },
      {
        className: 'Grade 10 - Biology',
        classCode: 'G10-BIO',
        subject: 'Science',
        schedule: { day: 'wednesday', startTime: '11:00', endTime: '12:30', room: 'Lab 2' },
        teacher: teacherDocs[1]
      }
    ];

    const classDocs = [];
    for (const classDef of classDefinitions) {
      const classDoc = new Education.Class({
        orgId: organization._id,
        className: classDef.className,
        classCode: classDef.classCode,
        academicYear: academicYear._id,
        teacherId: classDef.teacher._id,
        subject: classDef.subject,
        schedule: classDef.schedule,
        maxStudents: 30,
        status: 'active'
      });
      await classDoc.save({ session });
      classDocs.push(classDoc);
    }

    const courseDefinitions = [
      {
        courseCode: 'MATH101',
        courseName: 'Foundations of Algebra',
        description: 'Core mathematics curriculum covering algebraic principles',
        credits: 3,
        teacher: teacherDocs[0]
      },
      {
        courseCode: 'SCI102',
        courseName: 'Introduction to Biology',
        description: 'Overview of cell biology, genetics, and ecosystems',
        credits: 4,
        teacher: teacherDocs[1]
      }
    ];

    const courseDocs = [];
    for (const course of courseDefinitions) {
      const courseDoc = new Education.Course({
        orgId: organization._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        description: course.description,
        credits: course.credits,
        teacherId: course.teacher._id,
        academicYear: academicYear._id,
        status: 'active'
      });
      await courseDoc.save({ session });
      courseDocs.push(courseDoc);
    }

    const studentDefinitions = [
      {
        studentId: 'STD001',
        firstName: 'Michael',
        lastName: 'Chen',
        gender: 'male',
        email: 'michael.chen@student.edu',
        phone: '+1-555-3010',
        parentGuardian: { name: 'Lisa Chen', relationship: 'Mother', email: 'lisa.chen@example.com', phone: '+1-555-4010' },
        classes: [classDocs[0]]
      },
      {
        studentId: 'STD002',
        firstName: 'Sophia',
        lastName: 'Martinez',
        gender: 'female',
        email: 'sophia.martinez@student.edu',
        phone: '+1-555-3011',
        parentGuardian: { name: 'Carlos Martinez', relationship: 'Father', email: 'carlos.martinez@example.com', phone: '+1-555-4011' },
        classes: [classDocs[0], classDocs[1]]
      }
    ];

    const studentDocs = [];
    for (const student of studentDefinitions) {
      const studentDoc = new Education.Student({
        orgId: organization._id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: new Date(currentYear - 15, 3, 12),
        gender: student.gender,
        email: student.email,
        phone: student.phone,
        address: {
          street: '123 Academy Lane',
          city: 'Springfield',
          state: 'CA',
          zipCode: '94500',
          country: 'US'
        },
        parentGuardian: student.parentGuardian,
        academicYear: academicYear._id,
        classes: student.classes.map((cls) => cls._id),
        status: 'active'
      });
      await studentDoc.save({ session });
      studentDocs.push(studentDoc);
    }

    // Backfill students on classes
    for (const classDoc of classDocs) {
      const studentsInClass = studentDocs.filter((student) =>
        student.classes.some((clsId) => clsId.equals(classDoc._id))
      );
      await Education.Class.findByIdAndUpdate(
        classDoc._id,
        { students: studentsInClass.map((student) => student._id) },
        { session }
      );
    }

    const examsData = [
      {
        examCode: 'EXAM-MATH-1',
        examName: 'Mathematics Midterm',
        course: courseDocs[0],
        classRef: classDocs[0],
        examDate: new Date(currentYear, 9, 15),
        duration: 90,
        totalMarks: 100
      },
      {
        examCode: 'EXAM-SCI-1',
        examName: 'Biology Lab Assessment',
        course: courseDocs[1],
        classRef: classDocs[1],
        examDate: new Date(currentYear, 10, 5),
        duration: 60,
        totalMarks: 100
      }
    ];

    const examDocs = [];
    for (const exam of examsData) {
      const examDoc = new Education.Exam({
        orgId: organization._id,
        examCode: exam.examCode,
        examName: exam.examName,
        courseId: exam.course._id,
        classId: exam.classRef._id,
        examDate: exam.examDate,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        passingMarks: 50,
        status: 'scheduled'
      });
      await examDoc.save({ session });
      examDocs.push(examDoc);
    }

    const gradeEntries = [
      {
        student: studentDocs[0],
        classRef: classDocs[0],
        exam: examDocs[0],
        course: courseDocs[0],
        grade: 88,
        letterGrade: 'B',
        remarks: 'Strong analytical skills'
      },
      {
        student: studentDocs[1],
        classRef: classDocs[1],
        exam: examDocs[1],
        course: courseDocs[1],
        grade: 94,
        letterGrade: 'A',
        remarks: 'Excellent lab technique'
      }
    ];

    for (const grade of gradeEntries) {
      const gradeDoc = new Education.Grade({
        orgId: organization._id,
        studentId: grade.student._id,
        classId: grade.classRef._id,
        examId: grade.exam._id,
        courseId: grade.course._id,
        grade: grade.grade,
        letterGrade: grade.letterGrade,
        remarks: grade.remarks,
        gradedDate: new Date()
      });
      await gradeDoc.save({ session });
    }
  }

  /**
   * Seed healthcare-specific data
   */
  async seedHealthcareData(tenant, organization, session) {
    const doctorsData = [
      {
        doctorId: 'DOC001',
        firstName: 'Emily',
        lastName: 'Wilson',
        specialization: 'General Physician',
        email: 'emily.wilson@healthcare.org',
        phone: '+1-555-6101',
        licenseNumber: 'LIC-GP-1134',
        schedule: { days: ['monday', 'tuesday', 'thursday'], startTime: '08:30', endTime: '16:30' }
      },
      {
        doctorId: 'DOC002',
        firstName: 'Rahul',
        lastName: 'Patel',
        specialization: 'Cardiologist',
        email: 'rahul.patel@healthcare.org',
        phone: '+1-555-6102',
        licenseNumber: 'LIC-CARD-2219',
        schedule: { days: ['wednesday', 'friday'], startTime: '10:00', endTime: '18:00' }
      }
    ];

    const doctorDocs = [];
    for (const doctor of doctorsData) {
      const doctorDoc = new Healthcare.Doctor({
        orgId: organization._id,
        ...doctor,
        status: 'active'
      });
      await doctorDoc.save({ session });
      doctorDocs.push(doctorDoc);
    }

    const patientsData = [
      {
        patientId: 'PAT-1001',
        firstName: 'Noah',
        lastName: 'Bennett',
        gender: 'male',
        dateOfBirth: new Date(1988, 6, 21),
        phone: '+1-555-7101',
        email: 'noah.bennett@example.com',
        address: { street: '45 Maple Ave', city: 'Springfield', state: 'CA', zipCode: '94501', country: 'US' },
        emergencyContact: { name: 'Emma Bennett', relationship: 'Spouse', phone: '+1-555-7102' },
        bloodType: 'O+',
        allergies: ['Penicillin']
      },
      {
        patientId: 'PAT-1002',
        firstName: 'Ava',
        lastName: 'Singh',
        gender: 'female',
        dateOfBirth: new Date(1995, 2, 12),
        phone: '+1-555-7103',
        email: 'ava.singh@example.com',
        address: { street: '89 Pine Street', city: 'Springfield', state: 'CA', zipCode: '94502', country: 'US' },
        emergencyContact: { name: 'Raj Singh', relationship: 'Father', phone: '+1-555-7104' },
        bloodType: 'A+',
        allergies: []
      }
    ];

    const patientDocs = [];
    for (const patient of patientsData) {
      const patientDoc = new Healthcare.Patient({
        orgId: organization._id,
        ...patient,
        status: 'active'
      });
      await patientDoc.save({ session });
      patientDocs.push(patientDoc);
    }

    const appointmentsData = [
      {
        appointmentNumber: 'APT-5001',
        patient: patientDocs[0],
        doctor: doctorDocs[0],
        appointmentDate: new Date(),
        appointmentTime: '10:00',
        duration: 30,
        reason: 'Annual physical examination',
        status: 'confirmed'
      },
      {
        appointmentNumber: 'APT-5002',
        patient: patientDocs[1],
        doctor: doctorDocs[1],
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        appointmentTime: '14:30',
        duration: 45,
        reason: 'Cardiology follow-up',
        status: 'scheduled'
      }
    ];

    const appointmentDocs = [];
    for (const appointment of appointmentsData) {
      const appointmentDoc = new Healthcare.Appointment({
        orgId: organization._id,
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointment.patient._id,
        doctorId: appointment.doctor._id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        duration: appointment.duration,
        reason: appointment.reason,
        status: appointment.status
      });
      await appointmentDoc.save({ session });
      appointmentDocs.push(appointmentDoc);
    }

    const medicalRecordsData = [
      {
        recordNumber: 'MR-9001',
        patient: patientDocs[0],
        doctor: doctorDocs[0],
        visitDate: new Date(),
        diagnosis: 'Routine health check',
        symptoms: ['Fatigue'],
        treatment: 'Recommended balanced diet and exercise',
        notes: 'Vitals within normal range'
      }
    ];

    const medicalRecordDocs = [];
    for (const record of medicalRecordsData) {
      const recordDoc = new Healthcare.MedicalRecord({
        orgId: organization._id,
        recordNumber: record.recordNumber,
        patientId: record.patient._id,
        doctorId: record.doctor._id,
        visitDate: record.visitDate,
        diagnosis: record.diagnosis,
        symptoms: record.symptoms,
        treatment: record.treatment,
        notes: record.notes
      });
      await recordDoc.save({ session });
      medicalRecordDocs.push(recordDoc);
    }

    const prescriptionsData = [
      {
        prescriptionNumber: 'RX-7001',
        patient: patientDocs[0],
        doctor: doctorDocs[0],
        medications: [
          { name: 'Vitamin D', dosage: '1000 IU', frequency: 'Once daily', duration: '30 days', instructions: 'Take with breakfast' }
        ]
      },
      {
        prescriptionNumber: 'RX-7002',
        patient: patientDocs[1],
        doctor: doctorDocs[1],
        medications: [
          { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take in the evening' }
        ]
      }
    ];

    for (const prescription of prescriptionsData) {
      const prescriptionDoc = new Healthcare.Prescription({
        orgId: organization._id,
        prescriptionNumber: prescription.prescriptionNumber,
        patientId: prescription.patient._id,
        doctorId: prescription.doctor._id,
        medications: prescription.medications,
        issueDate: new Date(),
        status: 'active'
      });
      await prescriptionDoc.save({ session });
    }
  }}

  /**
   * Seed default data for new tenant - Complete ERP Instance
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async seedDefaultData(tenant, organization, session) {
    try {
      console.log(`Starting comprehensive ERP seeding for tenant: ${tenant.tenantId}`);
      
      // 1. Create default attendance policy
      await this.createDefaultAttendancePolicy(tenant, organization, session);
      
      // 2. Create default departments (needed for employees and other data)
      const departments = await this.createDefaultDepartments(tenant, organization, session);
      
      // 3. Create sample employees and payroll (needed for HR module)
      await this.createSampleEmployeesAndPayroll(tenant, organization, departments, session);
      
      // 4. Create default project templates
      await this.createDefaultProjectTemplates(tenant, organization, session);
      
      // 5. Create sample project (with tasks)
      const sampleProject = await this.createSampleProject(tenant, organization, session);
      
      // 6. Create sample tasks for the project (needed for Projects/Tasks module)
      await this.createSampleTasks(tenant, organization, sampleProject, session);
      
      // 7. Create default chart of accounts
      await this.createDefaultChartOfAccounts(tenant, organization, session);
      
      // 8. Create sample finance transactions (needed for Finance module)
      await this.createSampleFinanceTransactions(tenant, organization, session);
      
      // 9. Create sample clients and vendors
      await this.createSampleClientsAndVendors(tenant, organization, session);
      
      // 10. Create default notification templates
      await this.createDefaultNotificationTemplates(tenant, organization, session);
      
      // 12. Create default audit log entries
      await this.createDefaultAuditLogs(tenant, organization, session);
      
      console.log(`ERP seeding completed for tenant: ${tenant.tenantId}`);
      
      // Update tenant onboarding status
      await Tenant.findByIdAndUpdate(
        tenant._id,
        {
          'onboarding.steps.4.completed': true,
          'onboarding.steps.4.completedAt': new Date()
        },
        { session }
      );
      
    } catch (error) {
      console.error('Error seeding default data:', error);
      throw error;
    }
  }

  /**
   * Create default departments and teams
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   * @returns {Array} Created departments
   */
  async createDefaultDepartments(tenant, organization, session) {
    try {
      const departments = [
        {
          name: 'Human Resources',
          description: 'HR department for employee management',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          head: null,
          budget: 50000,
          status: 'active',
          isDefault: true
        },
        {
          name: 'Finance & Accounting',
          description: 'Finance department for financial management',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          head: null,
          budget: 75000,
          status: 'active',
          isDefault: true
        },
        {
          name: 'Project Management',
          description: 'Project management and delivery',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          head: null,
          budget: 100000,
          status: 'active',
          isDefault: true
        },
        {
          name: 'Operations',
          description: 'Operations and administration',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          head: null,
          budget: 60000,
          status: 'active',
          isDefault: true
        },
        {
          name: 'Sales & Marketing',
          description: 'Sales and marketing activities',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          head: null,
          budget: 80000,
          status: 'active',
          isDefault: true
        }
      ];

      const createdDepartments = [];
      for (const deptData of departments) {
        const department = new Department(deptData);
        await department.save({ session });
        createdDepartments.push(department);
      }

      // Create default teams within departments
      await this.createDefaultTeams(tenant, organization, createdDepartments, session);

      return createdDepartments;
      
    } catch (error) {
      console.error('Error creating default departments:', error);
      throw error;
    }
  }

  /**
   * Create default teams within departments
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Array} departments - Created departments
   * @param {Object} session - MongoDB session
   */
  async createDefaultTeams(tenant, organization, departments, session) {
    try {
      const teams = [
        {
          name: 'Development Team',
          description: 'Software development team',
          departmentId: departments.find(d => d.name === 'Project Management')._id,
          orgId: organization._id,
          tenantId: tenant.tenantId,
          lead: null,
          members: [],
          status: 'active'
        },
        {
          name: 'QA Team',
          description: 'Quality assurance team',
          departmentId: departments.find(d => d.name === 'Project Management')._id,
          orgId: organization._id,
          tenantId: tenant.tenantId,
          lead: null,
          members: [],
          status: 'active'
        },
        {
          name: 'Design Team',
          description: 'UI/UX design team',
          departmentId: departments.find(d => d.name === 'Project Management')._id,
          orgId: organization._id,
          tenantId: tenant.tenantId,
          lead: null,
          members: [],
          status: 'active'
        }
      ];

      for (const teamData of teams) {
        const team = new Team(teamData);
        await team.save({ session });
      }
      
    } catch (error) {
      console.error('Error creating default teams:', error);
      throw error;
    }
  }

  /**
   * Create default chart of accounts
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createDefaultChartOfAccounts(tenant, organization, session) {
    try {
      const chartOfAccounts = new ChartOfAccounts({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        name: 'Default Chart of Accounts',
        accounts: [
          // Assets
          { code: '1000', name: 'Current Assets', type: 'asset', parent: null, level: 1 },
          { code: '1100', name: 'Cash and Cash Equivalents', type: 'asset', parent: '1000', level: 2 },
          { code: '1200', name: 'Accounts Receivable', type: 'asset', parent: '1000', level: 2 },
          { code: '1300', name: 'Inventory', type: 'asset', parent: '1000', level: 2 },
          { code: '1400', name: 'Prepaid Expenses', type: 'asset', parent: '1000', level: 2 },
          
          // Liabilities
          { code: '2000', name: 'Current Liabilities', type: 'liability', parent: null, level: 1 },
          { code: '2100', name: 'Accounts Payable', type: 'liability', parent: '2000', level: 2 },
          { code: '2200', name: 'Accrued Expenses', type: 'liability', parent: '2000', level: 2 },
          { code: '2300', name: 'Short-term Debt', type: 'liability', parent: '2000', level: 2 },
          
          // Equity
          { code: '3000', name: 'Owner\'s Equity', type: 'equity', parent: null, level: 1 },
          { code: '3100', name: 'Capital', type: 'equity', parent: '3000', level: 2 },
          { code: '3200', name: 'Retained Earnings', type: 'equity', parent: '3000', level: 2 },
          
          // Revenue
          { code: '4000', name: 'Revenue', type: 'revenue', parent: null, level: 1 },
          { code: '4100', name: 'Service Revenue', type: 'revenue', parent: '4000', level: 2 },
          { code: '4200', name: 'Product Revenue', type: 'revenue', parent: '4000', level: 2 },
          
          // Expenses
          { code: '5000', name: 'Operating Expenses', type: 'expense', parent: null, level: 1 },
          { code: '5100', name: 'Salaries and Wages', type: 'expense', parent: '5000', level: 2 },
          { code: '5200', name: 'Rent and Utilities', type: 'expense', parent: '5000', level: 2 },
          { code: '5300', name: 'Marketing and Advertising', type: 'expense', parent: '5000', level: 2 },
          { code: '5400', name: 'Professional Services', type: 'expense', parent: '5000', level: 2 }
        ],
        isDefault: true,
        status: 'active'
      });

      await chartOfAccounts.save({ session });
      
    } catch (error) {
      console.error('Error creating default chart of accounts:', error);
      throw error;
    }
  }

  /**
   * Create sample clients and vendors
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createSampleClientsAndVendors(tenant, organization, session) {
    try {
      // Create sample clients
      const clients = [
        {
          name: 'TechCorp Solutions',
          email: 'contact@techcorp.com',
          phone: '+1-555-0123',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'corporate',
          status: 'active',
          billingAddress: {
            street: '123 Business Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US'
          },
          isSample: true
        },
        {
          name: 'StartupXYZ',
          email: 'hello@startupxyz.com',
          phone: '+1-555-0456',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'startup',
          status: 'active',
          billingAddress: {
            street: '456 Innovation St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
            country: 'US'
          },
          isSample: true
        }
      ];

      for (const clientData of clients) {
        const client = new Client(clientData);
        await client.save({ session });
      }

      // Create sample vendors
      const vendors = [
        {
          name: 'CloudHosting Inc',
          email: 'billing@cloudhosting.com',
          phone: '+1-555-0789',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'service',
          status: 'active',
          paymentTerms: 'Net 30',
          isSample: true
        },
        {
          name: 'Office Supplies Co',
          email: 'orders@officesupplies.com',
          phone: '+1-555-0321',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'supplier',
          status: 'active',
          paymentTerms: 'Net 15',
          isSample: true
        }
      ];

      for (const vendorData of vendors) {
        const vendor = new Vendor(vendorData);
        await vendor.save({ session });
      }
      
    } catch (error) {
      console.error('Error creating sample clients and vendors:', error);
      throw error;
    }
  }

  /**
   * Create default notification templates
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createDefaultNotificationTemplates(tenant, organization, session) {
    try {
      const templates = [
        {
          name: 'Project Deadline Reminder',
          description: 'Reminder for upcoming project deadlines',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'project',
          trigger: 'deadline_approaching',
          template: 'Project "{projectName}" deadline is approaching on {deadline}',
          isDefault: true,
          status: 'active'
        },
        {
          name: 'Payment Overdue',
          description: 'Notification for overdue invoices',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'finance',
          trigger: 'invoice_overdue',
          template: 'Payment for {clientName} is overdue',
          isDefault: true,
          status: 'active'
        },
        {
          name: 'New Task Assignment',
          description: 'Notification for new task assignments',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          type: 'task',
          trigger: 'task_assigned',
          template: 'You have been assigned a new task: {taskName}',
          isDefault: true,
          status: 'active'
        }
      ];

      for (const templateData of templates) {
        const notification = new Notification(templateData);
        await notification.save({ session });
      }
      
    } catch (error) {
      console.error('Error creating default notification templates:', error);
      throw error;
    }
  }

  /**
   * Create sample employees and payroll setup
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Array} departments - Created departments
   * @param {Object} session - MongoDB session
   */
  async createSampleEmployeesAndPayroll(tenant, organization, departments, session) {
    try {
      const employees = [
        {
          employeeId: 'EMP001',
          fullName: 'John Smith',
          email: 'john.smith@company.com',
          phone: '+1-555-0001',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          departmentId: departments.find(d => d.name === 'Project Management')._id,
          position: 'Senior Developer',
          hireDate: new Date('2023-01-15'),
          salary: 75000,
          currency: tenant.settings.currency,
          status: 'active',
          isSample: true
        },
        {
          employeeId: 'EMP002',
          fullName: 'Jane Doe',
          email: 'jane.doe@company.com',
          phone: '+1-555-0002',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          departmentId: departments.find(d => d.name === 'Human Resources')._id,
          position: 'HR Manager',
          hireDate: new Date('2023-02-01'),
          salary: 65000,
          currency: tenant.settings.currency,
          status: 'active',
          isSample: true
        }
      ];

      for (const empData of employees) {
        const employee = new Employee(empData);
        await employee.save({ session });
      }

      // Create payroll setup
      const payrollSetup = new Payroll({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        name: 'Default Payroll',
        payFrequency: 'monthly',
        payDay: 1, // 1st of each month
        currency: tenant.settings.currency,
        taxSettings: {
          federalTaxRate: 0.22,
          stateTaxRate: 0.05,
          socialSecurityRate: 0.062,
          medicareRate: 0.0145
        },
        deductions: [
          { name: 'Health Insurance', type: 'fixed', amount: 200 },
          { name: '401k Contribution', type: 'percentage', amount: 0.05 }
        ],
        isDefault: true,
        status: 'active'
      });

      await payrollSetup.save({ session });
      
    } catch (error) {
      console.error('Error creating sample employees and payroll:', error);
      throw error;
    }
  }

  /**
   * Create default audit log entries
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createDefaultAuditLogs(tenant, organization, session) {
    try {
      const auditLogs = [
        {
          orgId: organization._id,
          tenantId: tenant.tenantId,
          action: 'TENANT_CREATED',
          entityType: 'Tenant',
          entityId: tenant._id,
          userId: 'system',
          userEmail: 'system@tws.com',
          details: {
            tenantName: tenant.name,
            tenantId: tenant.tenantId
          },
          ipAddress: '127.0.0.1',
          userAgent: 'TWS-Provisioning-Service',
          timestamp: new Date()
        },
        {
          orgId: organization._id,
          tenantId: tenant.tenantId,
          action: 'ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: organization._id,
          userId: 'system',
          userEmail: 'system@tws.com',
          details: {
            organizationName: organization.name,
            organizationType: organization.type
          },
          ipAddress: '127.0.0.1',
          userAgent: 'TWS-Provisioning-Service',
          timestamp: new Date()
        }
      ];

      for (const logData of auditLogs) {
        const auditLog = new AuditLog(logData);
        await auditLog.save({ session });
      }
      
    } catch (error) {
      console.error('Error creating default audit logs:', error);
      throw error;
    }
  }

  /**
   * Create default attendance policy
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createDefaultAttendancePolicy(tenant, organization, session) {
    try {
      const attendancePolicy = new AttendancePolicy({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        name: 'Default Policy',
        description: 'Default attendance policy for new organization',
        workingHours: {
          startTime: '09:00',
          endTime: '17:00',
          breakDuration: 60, // minutes
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        overtime: {
          enabled: true,
          threshold: 8, // hours
          rate: 1.5 // 1.5x regular rate
        },
        lateArrival: {
          tolerance: 15, // minutes
          penalty: 'warning'
        },
        earlyDeparture: {
          tolerance: 15, // minutes
          penalty: 'warning'
        },
        remoteWork: {
          enabled: true,
          maxDaysPerWeek: 3,
          requiresApproval: true
        },
        isDefault: true,
        status: 'active'
      });

      await attendancePolicy.save({ session });
      
    } catch (error) {
      console.error('Error creating default attendance policy:', error);
      throw error;
    }
  }

  /**
   * Create default project templates
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createDefaultProjectTemplates(tenant, organization, session) {
    try {
      const templates = [
        {
          name: 'Web Development',
          description: 'Standard web development project template',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          phases: [
            { name: 'Planning', duration: 5, description: 'Project planning and requirements gathering' },
            { name: 'Design', duration: 10, description: 'UI/UX design and prototyping' },
            { name: 'Development', duration: 20, description: 'Frontend and backend development' },
            { name: 'Testing', duration: 5, description: 'Quality assurance and testing' },
            { name: 'Deployment', duration: 2, description: 'Production deployment and launch' }
          ],
          defaultSettings: {
            allowClientAccess: true,
            clientCanComment: true,
            requireApproval: false
          },
          isDefault: true
        },
        {
          name: 'Mobile App Development',
          description: 'Mobile application development template',
          orgId: organization._id,
          tenantId: tenant.tenantId,
          phases: [
            { name: 'Planning', duration: 7, description: 'App planning and wireframing' },
            { name: 'Design', duration: 14, description: 'UI/UX design and user flows' },
            { name: 'Development', duration: 30, description: 'Native app development' },
            { name: 'Testing', duration: 10, description: 'Device testing and bug fixes' },
            { name: 'App Store', duration: 5, description: 'App store submission and approval' }
          ],
          defaultSettings: {
            allowClientAccess: true,
            clientCanComment: true,
            requireApproval: true
          },
          isDefault: true
        }
      ];

      for (const templateData of templates) {
        const template = new ProjectTemplate(templateData);
        await template.save({ session });
      }
      
    } catch (error) {
      console.error('Error creating default project templates:', error);
      throw error;
    }
  }

  /**
   * Create sample project
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createSampleProject(tenant, organization, session) {
    try {
      const sampleProject = new Project({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        name: 'Welcome Project',
        slug: 'welcome-project',
        description: 'This is a sample project to help you get started with the system.',
        status: 'planning',
        priority: 'medium',
        budget: {
          total: 10000,
          currency: tenant.settings.currency,
          spent: 0,
          remaining: 10000
        },
        timeline: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          estimatedHours: 80,
          actualHours: 0
        },
        settings: {
          allowClientAccess: true,
          clientCanComment: true,
          clientCanApprove: false,
          requireApproval: false
        },
        tags: ['sample', 'welcome', 'getting-started'],
        isSample: true
      });

      await sampleProject.save({ session });
      return sampleProject;
      
    } catch (error) {
      console.error('Error creating sample project:', error);
      throw error;
    }
  }

  /**
   * Create sample tasks for a project
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} project - Project record
   * @param {Object} session - MongoDB session
   */
  async createSampleTasks(tenant, organization, project, session) {
    try {
      const Task = require('../models/Task');
      const User = require('../models/User');
      
      // Get admin user for task assignment
      const adminUser = await User.findOne({ 
        orgId: organization._id, 
        role: 'owner' 
      }).session(session);

      if (!adminUser) {
        console.warn('Admin user not found, skipping task creation');
        return;
      }

      const tasks = [
        {
          orgId: organization._id,
          projectId: project._id,
          title: 'Project Setup',
          description: 'Set up project infrastructure and initial configuration',
          status: 'in_progress',
          priority: 'high',
          reporter: adminUser._id,
          assignee: adminUser._id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          estimatedHours: 8,
          actualHours: 4,
          tags: ['setup', 'infrastructure']
        },
        {
          orgId: organization._id,
          projectId: project._id,
          title: 'Design Review',
          description: 'Review and approve initial design mockups',
          status: 'todo',
          priority: 'medium',
          reporter: adminUser._id,
          assignee: adminUser._id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          estimatedHours: 4,
          actualHours: 0,
          tags: ['design', 'review']
        },
        {
          orgId: organization._id,
          projectId: project._id,
          title: 'Development Phase 1',
          description: 'Implement core features and functionality',
          status: 'todo',
          priority: 'high',
          reporter: adminUser._id,
          assignee: adminUser._id,
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
          estimatedHours: 40,
          actualHours: 0,
          tags: ['development', 'core-features']
        },
        {
          orgId: organization._id,
          projectId: project._id,
          title: 'Testing & QA',
          description: 'Perform quality assurance testing',
          status: 'todo',
          priority: 'medium',
          reporter: adminUser._id,
          assignee: adminUser._id,
          dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
          estimatedHours: 16,
          actualHours: 0,
          tags: ['testing', 'qa']
        },
        {
          orgId: organization._id,
          projectId: project._id,
          title: 'Documentation',
          description: 'Create project documentation and user guides',
          status: 'completed',
          priority: 'low',
          reporter: adminUser._id,
          assignee: adminUser._id,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          estimatedHours: 8,
          actualHours: 8,
          completedDate: new Date(),
          tags: ['documentation']
        }
      ];

      for (const taskData of tasks) {
        const task = new Task(taskData);
        await task.save({ session });
      }

      console.log(`Created ${tasks.length} sample tasks for project: ${project.name}`);
      
    } catch (error) {
      console.error('Error creating sample tasks:', error);
      // Don't throw error - tasks are optional
    }
  }

  /**
   * Create sample finance transactions
   * @param {Object} tenant - Tenant record
   * @param {Object} organization - Organization record
   * @param {Object} session - MongoDB session
   */
  async createSampleFinanceTransactions(tenant, organization, session) {
    try {
      const { Transaction } = require('../models/Finance');
      const ChartOfAccounts = require('../models/Finance').ChartOfAccounts;
      const User = require('../models/User');
      
      // Get admin user for transaction creation
      const adminUser = await User.findOne({ 
        orgId: organization._id, 
        role: 'owner' 
      }).session(session);

      if (!adminUser) {
        console.warn('Admin user not found, skipping finance transaction creation');
        return;
      }

      // Get chart of accounts
      // ChartOfAccounts might have an accounts array or be individual account documents
      // Try to find the chart of accounts document first
      let chartOfAccounts = await ChartOfAccounts.findOne({
        orgId: organization._id,
        name: 'Default Chart of Accounts'
      }).session(session);

      // If chartOfAccounts has accounts array, use it; otherwise, query for individual accounts
      let revenueAccountId = null;
      let expenseAccountId = null;

      if (chartOfAccounts && chartOfAccounts.accounts && chartOfAccounts.accounts.length > 0) {
        // ChartOfAccounts has accounts array
        const revenueAccount = chartOfAccounts.accounts.find(acc => acc.code === '4000' || acc.code === '4100');
        const expenseAccount = chartOfAccounts.accounts.find(acc => acc.code === '5000' || acc.code === '5100');
        // Note: account IDs in the array might not be ObjectIds, so we'll use null and let the transaction save without accountId
      } else {
        // Try to find individual account documents
        const revenueAccountDoc = await ChartOfAccounts.findOne({
          orgId: organization._id,
          code: '4000'
        }).session(session);
        const expenseAccountDoc = await ChartOfAccounts.findOne({
          orgId: organization._id,
          code: '5000'
        }).session(session);
        
        if (revenueAccountDoc) revenueAccountId = revenueAccountDoc._id;
        if (expenseAccountDoc) expenseAccountId = expenseAccountDoc._id;
      }

      const transactions = [
        {
          orgId: organization._id,
          type: 'revenue',
          amount: 5000,
          currency: tenant.settings.currency || 'USD',
          description: 'Sample revenue transaction - Project payment',
          date: new Date(),
          accountId: revenueAccountId,
          category: 'services',
          status: 'paid'
        },
        {
          orgId: organization._id,
          type: 'expense',
          amount: 1500,
          currency: tenant.settings.currency || 'USD',
          description: 'Sample expense transaction - Office supplies',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          accountId: expenseAccountId,
          category: 'office_supplies',
          status: 'paid'
        },
        {
          orgId: organization._id,
          type: 'revenue',
          amount: 3000,
          currency: tenant.settings.currency || 'USD',
          description: 'Sample revenue transaction - Consulting services',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          accountId: revenueAccountId,
          category: 'services',
          status: 'paid'
        },
        {
          orgId: organization._id,
          type: 'expense',
          amount: 800,
          currency: tenant.settings.currency || 'USD',
          description: 'Sample expense transaction - Software subscription',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          accountId: expenseAccountId,
          category: 'software',
          status: 'paid'
        }
      ];

      for (const transactionData of transactions) {
        const transaction = new Transaction(transactionData);
        await transaction.save({ session });
      }

      console.log(`Created ${transactions.length} sample finance transactions`);
      
    } catch (error) {
      console.error('Error creating sample finance transactions:', error);
      // Don't throw error - transactions are optional
    }
  }

  /**
   * Send welcome email to admin user
   * @param {Object} tenant - Tenant record
   * @param {Object} adminUser - Admin user
   */
  async sendWelcomeEmail(tenant, adminUser) {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      const emailData = {
        to: adminUser.email,
        subject: `Welcome to ${tenant.name} - Your TWS ERP is Ready!`,
        template: 'tenant-welcome',
        data: {
          tenantName: tenant.name,
          adminName: adminUser.fullName,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          supportEmail: process.env.SUPPORT_EMAIL,
          tempPassword: 'Your temporary password has been sent separately'
        }
      };

      // Mock email sending - replace with actual email service
      console.log('Sending welcome email:', emailData);
      
      // Update tenant onboarding status
      await Tenant.findByIdAndUpdate(tenant._id, {
        'onboarding.steps.5.completed': true,
        'onboarding.steps.5.completedAt': new Date()
      });
      
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error - email failure shouldn't stop provisioning
    }
  }

  /**
   * Update onboarding status
   * @param {Object} tenant - Tenant record
   * @param {string} status - Onboarding status
   * @param {Object} session - MongoDB session
   */
  async updateOnboardingStatus(tenant, status, session) {
    try {
      await Tenant.findByIdAndUpdate(
        tenant._id,
        {
          'onboarding.status': status,
          'onboarding.completedAt': status === 'completed' ? new Date() : null
        },
        { session }
      );
      
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      throw error;
    }
  }

  /**
   * Generate connection string for tenant database
   * @param {string} tenantId - Tenant ID
   * @returns {string} Connection string
   */
  generateConnectionString(tenantId) {
    const baseUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = `tws_${tenantId}`;
    
    // Extract base connection string (without database name)
    // Handle both standard and Atlas connection strings
    let baseConnection = baseUri;
    if (baseUri.includes('/') && !baseUri.includes('mongodb+srv://')) {
      // Standard MongoDB URI: mongodb://host:port/dbname
      baseConnection = baseUri.replace(/\/[^/?]*(\?|$)/, '');
    } else if (baseUri.includes('mongodb+srv://')) {
      // MongoDB Atlas URI: mongodb+srv://user:pass@cluster.net/dbname
      baseConnection = baseUri.replace(/\/[^/?]*(\?|$)/, '');
    }
    
    return `${baseConnection}/${dbName}`;
  }

  /**
   * Generate temporary password for admin user
   * @returns {string} Temporary password
   */
  generateTemporaryPassword() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Initialize tenant database with indexes and collections
   * @param {string} tenantId - Tenant ID
   */
  async initializeTenantDatabase(tenantId) {
    try {
      // This would create necessary indexes and collections for the tenant
      // Implementation depends on your database setup
      console.log(`Initializing database for tenant: ${tenantId}`);
      
    } catch (error) {
      console.error('Error initializing tenant database:', error);
      throw error;
    }
  }

  /**
   * Get tenant onboarding status
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Onboarding status
   */
  async getOnboardingStatus(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        status: tenant.onboarding.status,
        steps: tenant.onboarding.steps,
        completedAt: tenant.onboarding.completedAt,
        progress: this.calculateOnboardingProgress(tenant.onboarding.steps)
      };
      
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      throw error;
    }
  }

  /**
   * Calculate onboarding progress percentage
   * @param {Array} steps - Onboarding steps
   * @returns {number} Progress percentage
   */
  calculateOnboardingProgress(steps) {
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  }

  /**
   * Complete onboarding step
   * @param {string} tenantId - Tenant ID
   * @param {string} stepName - Step name
   * @returns {Object} Updated status
   */
  async completeOnboardingStep(tenantId, stepName) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const stepIndex = tenant.onboarding.steps.findIndex(step => step.name === stepName);
      if (stepIndex === -1) {
        throw new Error('Step not found');
      }

      tenant.onboarding.steps[stepIndex].completed = true;
      tenant.onboarding.steps[stepIndex].completedAt = new Date();

      // Check if all steps are completed
      const allCompleted = tenant.onboarding.steps.every(step => step.completed);
      if (allCompleted) {
        tenant.onboarding.status = 'completed';
        tenant.onboarding.completedAt = new Date();
      }

      await tenant.save();

      return {
        status: tenant.onboarding.status,
        progress: this.calculateOnboardingProgress(tenant.onboarding.steps)
      };
      
    } catch (error) {
      console.error('Error completing onboarding step:', error);
      throw error;
    }
  }

  /**
   * Deactivate tenant (soft delete)
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Deactivation result
   */
  async deactivateTenant(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant status
      tenant.status = 'inactive';
      tenant.deactivatedAt = new Date();
      await tenant.save();

      // Deactivate all users
      await User.updateMany(
        { tenantId },
        { status: 'inactive', deactivatedAt: new Date() }
      );

      // Deactivate organization
      await Organization.updateMany(
        { tenantId },
        { status: 'inactive', deactivatedAt: new Date() }
      );

      return {
        success: true,
        message: 'Tenant deactivated successfully',
        deactivatedAt: tenant.deactivatedAt
      };
      
    } catch (error) {
      console.error('Error deactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Reactivation result
   */
  async reactivateTenant(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant status
      tenant.status = 'active';
      tenant.reactivatedAt = new Date();
      await tenant.save();

      // Reactivate all users
      await User.updateMany(
        { tenantId },
        { status: 'active', reactivatedAt: new Date() }
      );

      // Reactivate organization
      await Organization.updateMany(
        { tenantId },
        { status: 'active', reactivatedAt: new Date() }
      );

      return {
        success: true,
        message: 'Tenant reactivated successfully',
        reactivatedAt: tenant.reactivatedAt
      };
      
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      throw error;
    }
  }
}

module.exports = new TenantProvisioningService();

