#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const { IntegrationConfig, IntegrationLog } = require('../src/models/Integration');

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Aborting cleanup.');
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log(`Connected to MongoDB (${dryRun ? 'dry-run' : 'apply'} mode)`);

  const timeTrackingIntegrations = await IntegrationConfig.find({
    type: 'time_tracking'
  }).select('_id name provider type orgId');

  const integrationIds = timeTrackingIntegrations.map((doc) => doc._id);

  console.log(`Found ${timeTrackingIntegrations.length} IntegrationConfig documents with type='time_tracking'`);
  if (timeTrackingIntegrations.length > 0) {
    for (const item of timeTrackingIntegrations) {
      console.log(` - ${item._id} | ${item.name || 'N/A'} | provider=${item.provider || 'N/A'} | org=${item.orgId}`);
    }
  }

  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  const hasTimeTrackingCollection = existingCollections.some(
    (c) => c.name === 'timetrackingintegrations'
  );

  let timeTrackingCollectionCount = 0;
  if (hasTimeTrackingCollection) {
    timeTrackingCollectionCount = await mongoose.connection.db
      .collection('timetrackingintegrations')
      .countDocuments({});
  }
  console.log(`Found ${timeTrackingCollectionCount} documents in collection 'timetrackingintegrations'`);

  const relatedLogCount = integrationIds.length
    ? await IntegrationLog.countDocuments({ integrationId: { $in: integrationIds } })
    : 0;
  console.log(`Found ${relatedLogCount} IntegrationLog documents related to removed integrations`);

  if (dryRun) {
    console.log('Dry-run complete. No data changed.');
    await mongoose.disconnect();
    return;
  }

  if (integrationIds.length) {
    const logDeleteResult = await IntegrationLog.deleteMany({
      integrationId: { $in: integrationIds }
    });
    console.log(`Deleted IntegrationLog documents: ${logDeleteResult.deletedCount}`);
  } else {
    console.log('No matching IntegrationConfig documents found. Skipping log deletion.');
  }

  const cfgDeleteResult = await IntegrationConfig.deleteMany({
    type: 'time_tracking'
  });
  console.log(`Deleted IntegrationConfig documents: ${cfgDeleteResult.deletedCount}`);

  if (hasTimeTrackingCollection) {
    const legacyDeleteResult = await mongoose.connection.db
      .collection('timetrackingintegrations')
      .deleteMany({});
    console.log(`Deleted legacy timetrackingintegrations documents: ${legacyDeleteResult.deletedCount}`);
  } else {
    console.log("Collection 'timetrackingintegrations' not found. Skipping legacy cleanup.");
  }

  await mongoose.disconnect();
  console.log('Cleanup complete.');
}

run().catch(async (err) => {
  console.error('Cleanup failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});

