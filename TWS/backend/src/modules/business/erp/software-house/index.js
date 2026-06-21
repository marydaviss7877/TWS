/**
 * Software House ERP Routes
 * Business logic routes specific to software house ERP
 */

const attendance = require('../../routes/softwareHouseAttendance');
const nucleusPM = require('./nucleusPM');
// nucleusClientPortal - REMOVED COMPLETELY
// roles - MOVED TO src/routes/softwareHouseRoles.routes.js

module.exports = {
  attendance,
  nucleusPM
  // roles - MOVED TO src/routes/softwareHouseRoles.routes.js
  // nucleusClientPortal - REMOVED COMPLETELY
};
