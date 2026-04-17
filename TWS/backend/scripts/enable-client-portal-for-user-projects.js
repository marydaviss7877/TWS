#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../src/models/User');
const ProjectClient = require('../src/models/Client');
const Project = require('../src/models/Project');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const emailIndex = args.indexOf('--email');
const email = emailIndex >= 0 ? args[emailIndex + 1] : null;

if (!email) {
  console.error('Usage: node scripts/enable-client-portal-for-user-projects.js --email <client_email> [--apply]');
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('_id orgId email');
  if (!user) {
    console.log('NO_USER');
    return;
  }

  const projectClient = await ProjectClient.findOne({ orgId: user.orgId, userId: user._id }).select('_id');
  if (!projectClient) {
    console.log('NO_PROJECT_CLIENT_LINK');
    return;
  }

  const filter = {
    orgId: user.orgId,
    clientId: projectClient._id,
    'settings.portalSettings.allowClientPortal': { $ne: true }
  };

  const count = await Project.countDocuments(filter);
  console.log(`MATCHING_PROJECTS=${count}`);
  if (!apply) {
    console.log('DRY_RUN');
    return;
  }

  const update = {
    $set: {
      'settings.portalSettings.isPortalProject': true,
      'settings.portalSettings.portalVisibility': 'client_only',
      'settings.portalSettings.allowClientPortal': true,
      'settings.portalSettings.requireClientApproval': true,
      'settings.portalSettings.autoNotifyClient': true,
      'settings.portalSettings.syncWithERP': true,
      'settings.portalSettings.features.projectProgress': true,
      'settings.portalSettings.features.timeTracking': true,
      'settings.portalSettings.features.documents': true,
      'settings.portalSettings.features.communication': true
    }
  };

  const result = await Project.updateMany(filter, update);
  console.log(`UPDATED=${result.modifiedCount}`);
}

main()
  .catch((error) => {
    console.error('FAILED', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore
    }
  });
