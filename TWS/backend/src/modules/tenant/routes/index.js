/**
 * Tenant Module Routes Index
 * Centralized exports for all tenant-related routes (Software House only)
 */

const management = require('./management');
const dashboard = require('./dashboard');
const switching = require('./switching');
const organization = require('./organization');
const permissions = require('./permissions');
const roles = require('./roles');
const departments = require('./departments');
const departmentAccess = require('./departmentAccess');
const audit = require('./audit');

const softwareHouseERP = require('../erp/software-house');

module.exports = {
  management,
  dashboard,
  switching,
  organization,
  softwareHouse: softwareHouseERP.softwareHouse,
  permissions,
  roles,
  departments,
  departmentAccess,
  audit
};

module.exports.management = management;
module.exports.dashboard = dashboard;
module.exports.switching = switching;
module.exports.organization = organization;
module.exports.softwareHouse = softwareHouseERP.softwareHouse;
module.exports.permissions = permissions;
module.exports.roles = roles;
module.exports.departments = departments;
module.exports.departmentAccess = departmentAccess;
module.exports.audit = audit;
