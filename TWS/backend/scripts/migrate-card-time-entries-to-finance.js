#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');

const Card = require('../src/models/Card');
const Project = require('../src/models/Project');
const { TimeEntry } = require('../src/models/Finance');

const LEGACY_MIGRATION_TAG_PREFIX = 'legacy-card-migration:';
const CARD_TAG_PREFIX = 'card:';

const hasFlag = (flag) => process.argv.includes(flag);
const getArgValue = (name) => {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : null;
};

const buildLegacyKey = ({ cardId, userId, date, duration, billable, description }) => {
  const payload = [
    String(cardId || ''),
    String(userId || ''),
    new Date(date).toISOString(),
    Number(duration || 0).toFixed(4),
    billable ? '1' : '0',
    String(description || '').trim()
  ].join('|');
  const digest = crypto.createHash('sha1').update(payload).digest('hex');
  return `${LEGACY_MIGRATION_TAG_PREFIX}${digest}`;
};

async function loadProjectsMap(projectIds) {
  const docs = await Project.find({ _id: { $in: projectIds } })
    .select('_id clientId profitability.hourlyRate')
    .lean();
  return new Map(docs.map((project) => [String(project._id), project]));
}

async function run() {
  const dryRun = hasFlag('--dry-run');
  const orgIdFilter = getArgValue('--orgId');
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Aborting migration.');
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const cardQuery = {};
  if (orgIdFilter) {
    cardQuery.orgId = orgIdFilter;
  }

  const cards = await Card.find(cardQuery)
    .select('_id orgId projectId title timeTracking.entries')
    .lean();

  const projectIds = [...new Set(cards.map((card) => String(card.projectId || '')).filter(Boolean))];
  const projectsMap = await loadProjectsMap(projectIds);

  const candidates = [];
  let skippedInvalid = 0;

  for (const card of cards) {
    const entries = Array.isArray(card.timeTracking?.entries) ? card.timeTracking.entries : [];
    const project = projectsMap.get(String(card.projectId || ''));
    if (!project) continue;
    for (const legacyEntry of entries) {
      if (!legacyEntry?.userId || !legacyEntry?.date) {
        skippedInvalid += 1;
        continue;
      }
      const hours = Number(legacyEntry.duration || 0);
      if (!Number.isFinite(hours) || hours <= 0) {
        skippedInvalid += 1;
        continue;
      }
      const keyTag = buildLegacyKey({
        cardId: card._id,
        userId: legacyEntry.userId,
        date: legacyEntry.date,
        duration: hours,
        billable: legacyEntry.billable !== false,
        description: legacyEntry.description
      });
      candidates.push({
        orgId: card.orgId,
        employeeId: legacyEntry.userId,
        projectId: card.projectId,
        taskId: null,
        clientId: project.clientId || null,
        date: new Date(legacyEntry.date),
        hours: Math.round(hours * 100) / 100,
        description: legacyEntry.description || `Migrated from card ${card.title || card._id}`,
        task: card.title || 'Card work',
        hourlyRate: Number(project.profitability?.hourlyRate || 0),
        billable: legacyEntry.billable !== false,
        billableHours: legacyEntry.billable !== false ? Math.round(hours * 100) / 100 : 0,
        status: 'approved',
        tags: [keyTag, `${CARD_TAG_PREFIX}${card._id}`],
        timer: {
          startedAt: new Date(legacyEntry.date),
          stoppedAt: new Date(legacyEntry.date),
          isRunning: false
        }
      });
    }
  }

  const migrationTags = candidates.map((item) => item.tags[0]);
  const existing = migrationTags.length > 0
    ? await TimeEntry.find({ tags: { $in: migrationTags } }).select('tags').lean()
    : [];
  const existingTags = new Set();
  existing.forEach((doc) => {
    (doc.tags || []).forEach((tag) => {
      if (typeof tag === 'string' && tag.startsWith(LEGACY_MIGRATION_TAG_PREFIX)) {
        existingTags.add(tag);
      }
    });
  });

  const inserts = candidates.filter((item) => !existingTags.has(item.tags[0]));

  console.log(`Found cards: ${cards.length}`);
  console.log(`Legacy candidate entries: ${candidates.length}`);
  console.log(`Existing already-migrated entries: ${existingTags.size}`);
  console.log(`Invalid/skipped legacy rows: ${skippedInvalid}`);
  console.log(`Entries to insert: ${inserts.length}`);

  if (dryRun) {
    console.log('Dry-run complete. No data changed.');
    await mongoose.disconnect();
    return;
  }

  if (inserts.length > 0) {
    await TimeEntry.insertMany(inserts, { ordered: false });
  }

  console.log(`Migration complete. Inserted ${inserts.length} centralized TimeEntry rows.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
