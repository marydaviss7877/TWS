/**
 * Integration Module Routes Index
 * Centralized exports for all integration-related routes
 */

const integrations = require('./integrations');
const timezone = require('./timezone');
const defaultContacts = require('./defaultContacts');

module.exports = {
  integrations,
  timezone,
  defaultContacts
};

// Named exports for direct access
module.exports.integrations = integrations;
module.exports.timezone = timezone;
module.exports.defaultContacts = defaultContacts;
