/**
 * Seed a hardcoded employee user for sufyan@gmail.com's company (same org).
 * Use for Software House Employee Portal login.
 *
 * Usage (from backend folder):
 *   node scripts/seed-employee-sufyan.js
 *
 * Requires MONGO_URI or MONGODB_URI in .env.
 *
 * Login credentials after running:
 *   URL:  /login
 *   Email: employee@sufyan.com
 *   Password: Employee@123
 *   Role: Employee (redirects to Employee Portal)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/tws';

// Hardcoded employee credentials (sufyan owner's company)
const OWNER_EMAIL = 'sufyan@gmail.com';
const EMPLOYEE_EMAIL = 'employee@sufyan.com';
const EMPLOYEE_PASSWORD = 'Employee@123';
const EMPLOYEE_FULL_NAME = 'Employee One';

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.\n');

    const User = require(path.join(__dirname, '../src/models/User'));
    const Employee = require(path.join(__dirname, '../src/models/Employee'));
    const Organization = require(path.join(__dirname, '../src/models/Organization'));

    const ownerUser = await User.findOne({ email: OWNER_EMAIL.toLowerCase().trim() }).select('_id orgId').lean();
    if (!ownerUser) {
      console.error('No user found with email:', OWNER_EMAIL, '- Create that owner first (e.g. via signup).');
      process.exit(1);
    }
    const orgId = ownerUser.orgId;
    if (!orgId) {
      console.error('Owner', OWNER_EMAIL, 'has no orgId.');
      process.exit(1);
    }

    const org = await Organization.findById(orgId).select('slug name').lean();
    if (!org) {
      console.error('Organization not found for orgId:', orgId);
      process.exit(1);
    }
    console.log('Owner company: orgId=', orgId.toString(), 'slug=', org.slug, 'name=', org.name);

    let empUser = await User.findOne({ email: EMPLOYEE_EMAIL.toLowerCase().trim() });
    if (empUser) {
      console.log('Employee user already exists:', EMPLOYEE_EMAIL);
      empUser.password = EMPLOYEE_PASSWORD; // will be hashed by pre('save')
      empUser.fullName = EMPLOYEE_FULL_NAME;
      empUser.role = 'employee';
      empUser.status = 'active';
      empUser.orgId = orgId;
      await empUser.save();
      console.log('Updated existing employee user (password set to hardcoded value).');
    } else {
      empUser = new User({
        email: EMPLOYEE_EMAIL.toLowerCase().trim(),
        password: EMPLOYEE_PASSWORD,
        fullName: EMPLOYEE_FULL_NAME,
        role: 'employee',
        orgId,
        status: 'active'
      });
      await empUser.save();
      console.log('Created employee user:', EMPLOYEE_EMAIL);
    }

    const existingEmployee = await Employee.findOne({ userId: empUser._id });
    if (existingEmployee) {
      console.log('Employee record already exists for this user (employeeId:', existingEmployee.employeeId, ').');
    } else {
      const empId = 'EMP-SUF-' + Date.now().toString(36).toUpperCase().slice(-6);
      await Employee.create({
        userId: empUser._id,
        employeeId: empId,
        organizationId: orgId,
        orgId,
        jobTitle: 'Software Developer',
        department: 'Development',
        hireDate: new Date(),
        contractType: 'full-time',
        salary: {
          base: 5000,
          currency: 'USD',
          payFrequency: 'monthly'
        },
        leaveBalance: { annual: 20, sick: 10, personal: 5 }
      });
      console.log('Created Employee record:', empId);
    }

    console.log('\n--- Login credentials (Software House Employee Portal) ---');
    console.log('URL:      /login');
    console.log('Email:    ' + EMPLOYEE_EMAIL);
    console.log('Password: ' + EMPLOYEE_PASSWORD);
    console.log('Tenant:   ' + org.slug + ' (same as owner sufyan@gmail.com)');
    console.log('After login you will be redirected to: /tenant/' + org.slug + '/org/software-house/employee-portal');
    console.log('---');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

main();
