const { TimeEntry } = require('../../models/finance/Finance');

const buildDateFilter = (from, to) => {
  if (!from && !to) return null;
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return filter;
};

const aggregateTimeSources = async ({ orgId, projectId, userId, from, to }) => {
  const dateFilter = buildDateFilter(from, to);

  const financeFilter = { orgId };
  if (projectId) financeFilter.projectId = projectId;
  if (userId) financeFilter.employeeId = userId;
  if (dateFilter) financeFilter.date = dateFilter;

  const financeEntriesRaw = await TimeEntry.find(financeFilter)
    .select('projectId employeeId date hours billable description task')
    .lean();

  const financeEntries = financeEntriesRaw.map((entry) => ({
    source: 'finance',
    projectId: entry.projectId || null,
    userId: entry.employeeId || null,
    date: entry.date,
    hours: Number(entry.hours || 0),
    billable: Boolean(entry.billable),
    description: entry.description || entry.task || '',
    cardTitle: ''
  }));

  const entries = financeEntries;
  const summary = entries.reduce((acc, item) => {
    acc.totalHours += item.hours;
    if (item.billable) acc.billableHours += item.hours;
    if (item.source === 'finance') acc.financeHours += item.hours;
    return acc;
  }, {
    totalHours: 0,
    billableHours: 0,
    // Kept for backward-compatible response shape.
    cardHours: 0,
    financeHours: 0
  });

  return {
    summary,
    entries: entries.sort((a, b) => new Date(b.date) - new Date(a.date))
  };
};

module.exports = { aggregateTimeSources };
