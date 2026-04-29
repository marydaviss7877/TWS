const Employee = require('../../models/hr-payroll/Employee');
const User = require('../../models/users-auth/User');

class EmployeeService {
  /**
   * Create employee
   * @param {string} orgId - Organization ID
   * @param {Object} employeeData - Employee data
   * @returns {Object} Created employee
   */
  async createEmployee(orgId, employeeData) {
    try {
      // Validate required fields
      if (!employeeData.userId && !employeeData.email) {
        throw new Error('Either userId or email is required');
      }

      // If email provided but no userId, find or create user
      let userId = employeeData.userId;
      if (!userId && employeeData.email) {
        let user = await User.findOne({ email: employeeData.email });
        if (!user) {
          // Create user if doesn't exist
          user = new User({
            email: employeeData.email,
            fullName: employeeData.fullName || employeeData.name,
            password: require('crypto').randomBytes(16).toString('hex'), // Temporary password
            role: 'employee',
            orgId: orgId
          });
          await user.save();
        }
        userId = user._id;
      }

      // Auto-generate employee ID if not provided
      if (!employeeData.employeeId) {
        employeeData.employeeId = await this.generateEmployeeId(orgId);
      }

      // Check if employee already exists
      const existing = await Employee.findOne({
        orgId: orgId,
        $or: [
          { employeeId: employeeData.employeeId },
          { userId: userId }
        ]
      });

      if (existing) {
        throw new Error('Employee already exists with this ID or user');
      }

      const employee = new Employee({
        ...employeeData,
        orgId: orgId,
        userId: userId,
        status: employeeData.status || 'active'
      });

      await employee.save();
      await employee.populate('userId', 'fullName email');
      await employee.populate('department', 'name');
      await employee.populate('reportingManager', 'fullName email');

      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  /**
   * Get employees
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Employees list with pagination
   */
  async getEmployees(orgId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        department,
        status,
        role
      } = filters;

      const query = { orgId: orgId };

      if (status) query.status = status;
      if (department) query.department = department;
      if (role) query.role = role;

      if (search) {
        query.$or = [
          { employeeId: { $regex: search, $options: 'i' } },
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { 'contactInfo.email': { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [employees, total] = await Promise.all([
        Employee.find(query)
          .populate('userId', 'fullName email')
          .populate('department', 'name')
          .populate('reportingManager', 'fullName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Employee.countDocuments(query)
      ]);

      return {
        employees: employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID
   * @param {string} orgId - Organization ID
   * @param {string} employeeId - Employee ID
   * @returns {Object} Employee
   */
  async getEmployeeById(orgId, employeeId) {
    try {
      const employee = await Employee.findOne({
        $or: [
          { _id: employeeId, orgId: orgId },
          { employeeId: employeeId, orgId: orgId }
        ]
      })
        .populate('userId', 'fullName email')
        .populate('department', 'name description')
        .populate('reportingManager', 'fullName email')
        .populate('team', 'name');

      if (!employee) {
        throw new Error('Employee not found');
      }

      return employee;
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  }

  /**
   * Update employee
   * @param {string} orgId - Organization ID
   * @param {string} employeeId - Employee ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated employee
   */
  async updateEmployee(orgId, employeeId, updates) {
    try {
      const employee = await Employee.findOne({
        $or: [
          { _id: employeeId, orgId: orgId },
          { employeeId: employeeId, orgId: orgId }
        ]
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Update fields
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'orgId' && key !== 'employeeId') {
          if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
            employee[key] = { ...employee[key], ...updates[key] };
          } else {
            employee[key] = updates[key];
          }
        }
      });

      await employee.save();
      await employee.populate('userId', 'fullName email');
      await employee.populate('department', 'name');
      await employee.populate('reportingManager', 'fullName email');

      return employee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  /**
   * Delete employee (soft delete)
   * @param {string} orgId - Organization ID
   * @param {string} employeeId - Employee ID
   * @returns {Object} Deleted employee
   */
  async deleteEmployee(orgId, employeeId) {
    try {
      const employee = await Employee.findOne({
        $or: [
          { _id: employeeId, orgId: orgId },
          { employeeId: employeeId, orgId: orgId }
        ]
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Soft delete
      employee.status = 'inactive';
      employee.deletedAt = new Date();
      await employee.save();

      return employee;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  /**
   * Generate employee ID
   * @param {string} orgId - Organization ID
   * @returns {string} Generated employee ID
   */
  async generateEmployeeId(orgId) {
    try {
      const prefix = 'EMP';
      const lastEmployee = await Employee.findOne({ orgId: orgId })
        .sort({ employeeId: -1 });

      let sequence = 1;
      if (lastEmployee && lastEmployee.employeeId) {
        const lastId = lastEmployee.employeeId.replace(prefix, '');
        const lastNum = parseInt(lastId) || 0;
        sequence = lastNum + 1;
      }

      return `${prefix}${String(sequence).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      return `EMP${Date.now().toString().slice(-8)}`;
    }
  }
}

module.exports = new EmployeeService();
