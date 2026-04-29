/**
 * Permission Matrix for tenant ERP
 * Defines what actions each role can perform on each resource
 */
const PERMISSIONS = {
  tenant: {
    students: {
      view: ['principal', 'admin', 'teacher', 'counselor', 'academic_coordinator', 'lab_instructor', 'assistant_teacher', 'librarian', 'sports_coach', 'admin_staff', 'student'],
      create: ['principal', 'admin'],
      update: ['principal', 'admin', 'teacher'],
      delete: ['principal', 'admin'],
      viewOwn: ['student'],
      counsel: ['counselor', 'principal', 'admin'], // New action for counselors
      promote: ['principal', 'admin'],
      transfer: ['principal', 'admin']
    },
    teachers: {
      view: ['principal', 'admin', 'teacher', 'academic_coordinator', 'head_teacher'],
      create: ['principal', 'admin'],
      update: ['principal', 'admin'],
      delete: ['principal', 'admin'],
      assign: ['principal', 'admin']
    },
    grades: {
      view: ['principal', 'admin', 'teacher', 'academic_coordinator', 'head_teacher', 'lab_instructor', 'counselor', 'student'],
      create: ['teacher', 'lab_instructor'],
      update: ['teacher', 'lab_instructor', 'principal', 'admin', 'head_teacher'],
      delete: ['principal', 'admin'],
      approve: ['principal', 'admin'],
      viewOwn: ['student']
    },
    courses: {
      view: ['principal', 'admin', 'teacher', 'student'],
      create: ['principal', 'admin'],
      update: ['principal', 'admin'],
      delete: ['principal', 'admin'],
      enroll: ['principal', 'admin', 'student']
    },
    classes: {
      view: ['principal', 'admin', 'teacher', 'student'],
      create: ['principal', 'admin'],
      update: ['principal', 'admin'],
      delete: ['principal', 'admin'],
      assign: ['principal', 'admin']
    },
    attendance: {
      view: ['principal', 'admin', 'teacher', 'academic_coordinator', 'head_teacher', 'lab_instructor', 'assistant_teacher', 'sports_coach', 'counselor', 'student'],
      mark: ['teacher', 'lab_instructor', 'assistant_teacher', 'sports_coach', 'principal', 'admin'],
      update: ['principal', 'admin', 'head_teacher'],
      delete: ['principal', 'admin'],
      viewOwn: ['student']
    },
    exams: {
      view: ['principal', 'admin', 'teacher', 'student'],
      create: ['principal', 'admin', 'teacher'],
      update: ['principal', 'admin', 'teacher'],
      delete: ['principal', 'admin'],
      viewOwn: ['student']
    },
    academicYear: {
      view: ['principal', 'admin', 'teacher', 'student'],
      create: ['principal', 'admin'],
      update: ['principal', 'admin'],
      delete: ['principal', 'admin']
    },
    reports: {
      view: ['principal', 'admin', 'teacher'],
      generate: ['principal', 'admin'],
      export: ['principal', 'admin']
    },
    dashboard: {
      viewPrincipal: ['principal', 'admin'],
      viewTeacher: ['teacher', 'head_teacher', 'academic_coordinator', 'lab_instructor', 'assistant_teacher', 'principal', 'admin'],
      viewStudent: ['student', 'principal', 'admin'],
      viewCounselor: ['counselor', 'principal', 'admin'],
      viewLibrarian: ['librarian', 'principal', 'admin'],
      viewSportsCoach: ['sports_coach', 'principal', 'admin']
    },
    // New resources for faculty roles
    library: {
      view: ['principal', 'admin', 'librarian', 'student', 'teacher'],
      manage: ['principal', 'admin', 'librarian'],
      issue: ['librarian', 'principal', 'admin'],
      return: ['librarian', 'principal', 'admin'],
      addBook: ['librarian', 'principal', 'admin'],
      deleteBook: ['principal', 'admin']
    },
    counseling: {
      view: ['counselor', 'principal', 'admin'],
      create: ['counselor', 'principal', 'admin'],
      update: ['counselor', 'principal', 'admin'],
      delete: ['principal', 'admin']
    },
    sports: {
      view: ['sports_coach', 'principal', 'admin', 'student'],
      manage: ['sports_coach', 'principal', 'admin'],
      schedule: ['sports_coach', 'principal', 'admin']
    },
    equipment: {
      view: ['lab_instructor', 'principal', 'admin'],
      manage: ['lab_instructor', 'principal', 'admin'],
      maintain: ['lab_instructor', 'principal', 'admin']
    },
    programs: {
      view: ['principal', 'admin', 'academic_coordinator', 'teacher', 'student'],
      create: ['principal', 'admin', 'academic_coordinator'],
      update: ['principal', 'admin', 'academic_coordinator'],
      delete: ['principal', 'admin']
    },
    transportation: {
      view: ['principal', 'admin', 'teacher', 'student'],
      manage: ['principal', 'admin'],
      schedule: ['principal', 'admin'],
      assign: ['principal', 'admin']
    },
    hostel: {
      view: ['principal', 'admin', 'teacher', 'student'],
      manage: ['principal', 'admin'],
      assign: ['principal', 'admin'],
      viewOwn: ['student']
    }
  }
};

/**
 * Check if a role has permission for an action on a resource
 * @param {string} resource - Resource name (e.g., 'students', 'grades')
 * @param {string} action - Action name (e.g., 'view', 'create', 'update')
 * @param {string} role - User role (e.g., 'principal', 'teacher', 'student')
 * @returns {boolean} - True if role has permission
 */
const hasPermission = (resource, action, role) => {
  const permissions = PERMISSIONS.tenant[resource];
  if (!permissions) {
    return false;
  }

  const allowedRoles = permissions[action];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {object} - Object mapping resources to allowed actions
 */
const getRolePermissions = (role) => {
  const rolePermissions = {};
  
  for (const [resource, actions] of Object.entries(PERMISSIONS.tenant)) {
    rolePermissions[resource] = [];
    for (const [action, allowedRoles] of Object.entries(actions)) {
      if (allowedRoles.includes(role)) {
        rolePermissions[resource].push(action);
      }
    }
  }
  
  return rolePermissions;
};

module.exports = {
  PERMISSIONS,
  hasPermission,
  getRolePermissions
};
