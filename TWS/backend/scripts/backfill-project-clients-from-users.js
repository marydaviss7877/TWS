#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../src/models/User');
const ProjectClient = require('../src/models/Client');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArgValue = (key) => {
  const idx = args.indexOf(key);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
};

const apply = hasFlag('--apply');
const onlyEmail = getArgValue('--email');
const onlyOrgId = getArgValue('--orgId');

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const buildBaseSlug = (nameOrEmail) => {
  return (nameOrEmail || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'client';
};

const resolveUniqueSlug = async (orgId, baseSlug) => {
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await ProjectClient.exists({ orgId, slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in environment');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  console.log(apply ? 'Mode: APPLY (writes enabled)' : 'Mode: DRY-RUN (no writes)');

  const userFilter = {
    role: { $in: ['client', 'customer'] },
    status: { $ne: 'inactive' }
  };

  if (onlyEmail) userFilter.email = String(onlyEmail).trim().toLowerCase();
  const orgObjectId = toObjectId(onlyOrgId);
  if (onlyOrgId && !orgObjectId) {
    throw new Error('Invalid --orgId value. Must be a valid ObjectId');
  }
  if (orgObjectId) userFilter.orgId = orgObjectId;

  const users = await User.find(userFilter)
    .select('_id fullName email role status orgId')
    .lean();

  console.log(`Found ${users.length} candidate client users`);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const orgId = user.orgId;
    if (!orgId) {
      skipped += 1;
      console.log(`SKIP ${user.email}: missing orgId`);
      continue;
    }

    const existing = await ProjectClient.findOne({ orgId, userId: user._id });
    const email = String(user.email || '').trim().toLowerCase();
    const name = String(user.fullName || email || 'Client').trim();

    if (existing) {
      const patch = {
        name: existing.name || name,
        status: existing.status || 'active',
        contact: {
          ...existing.contact,
          primary: {
            ...(existing.contact?.primary || {}),
            email: existing.contact?.primary?.email || email
          }
        },
        portal: {
          ...existing.portal,
          enabled: existing.portal?.enabled !== false,
          accessLevel: existing.portal?.accessLevel || 'approve'
        }
      };

      if (apply) {
        existing.set(patch);
        // eslint-disable-next-line no-await-in-loop
        await existing.save();
      }
      updated += 1;
      console.log(`UPDATE ${email} -> existing ProjectClient ${existing._id}`);
      continue;
    }

    const baseSlug = buildBaseSlug(name || email);
    const slug = await resolveUniqueSlug(orgId, baseSlug);
    const createDoc = {
      orgId,
      userId: user._id,
      name,
      slug,
      type: 'company',
      status: 'active',
      contact: { primary: { email } },
      portal: { enabled: true, accessLevel: 'approve' }
    };

    if (apply) {
      // eslint-disable-next-line no-await-in-loop
      await ProjectClient.create(createDoc);
    }
    created += 1;
    console.log(`CREATE ${email} -> slug "${slug}"`);
  }

  console.log('\nBackfill summary');
  console.log(`- Created: ${created}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
};

run()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore close failures
    }
  });
