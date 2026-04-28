const { TimeEntry } = require('../../models/Finance');

const DEFAULT_WEEKLY_HOURS = 40;
const OVERTIME_MULTIPLIER = 1.5;
const ELIGIBLE_STATUSES = ['approved', 'billed', 'invoiced'];

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const calculateExpectedHoursForPeriod = (employee, periodStart, periodEnd) => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1);
  const weeklyHours = toNumber(employee?.workSchedule?.hoursPerWeek, DEFAULT_WEEKLY_HOURS);
  return Math.round(((weeklyHours * days) / 7) * 100) / 100;
};

const buildEmployeeTimeMap = async ({ orgId, periodStart, periodEnd, employeeUserIds = [] }) => {
  const match = {
    orgId,
    status: { $in: ELIGIBLE_STATUSES },
    date: { $gte: new Date(periodStart), $lte: new Date(periodEnd) }
  };
  if (Array.isArray(employeeUserIds) && employeeUserIds.length > 0) {
    match.employeeId = { $in: employeeUserIds };
  }

  const rows = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employeeId',
        totalHours: { $sum: { $ifNull: ['$hours', 0] } },
        billableHours: {
          $sum: {
            $cond: [{ $eq: ['$billable', true] }, { $ifNull: ['$hours', 0] }, 0]
          }
        },
        nonBillableHours: {
          $sum: {
            $cond: [{ $eq: ['$billable', false] }, { $ifNull: ['$hours', 0] }, 0]
          }
        },
        entryCount: { $sum: 1 },
        projectIds: { $addToSet: '$projectId' }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), {
      totalHours: Math.round(toNumber(row.totalHours) * 100) / 100,
      billableHours: Math.round(toNumber(row.billableHours) * 100) / 100,
      nonBillableHours: Math.round(toNumber(row.nonBillableHours) * 100) / 100,
      entryCount: toNumber(row.entryCount),
      projectsCount: Array.isArray(row.projectIds) ? row.projectIds.filter(Boolean).length : 0
    });
  });
  return map;
};

const buildPayrollTimeSnapshot = (employee, timeData, periodStart, periodEnd) => {
  const expectedHours = calculateExpectedHoursForPeriod(employee, periodStart, periodEnd);
  const totalHours = toNumber(timeData?.totalHours);
  const overtimeHours = Math.max(0, totalHours - expectedHours);
  const regularHours = Math.max(0, totalHours - overtimeHours);
  const salaryBase = toNumber(employee?.salary?.base);
  const hourlyRate = expectedHours > 0 ? salaryBase / expectedHours : 0;
  const overtimeRate = hourlyRate * OVERTIME_MULTIPLIER;
  const overtimePay = overtimeHours * overtimeRate;

  return {
    hoursWorked: {
      regular: Math.round(regularHours * 100) / 100,
      overtime: Math.round(overtimeHours * 100) / 100,
      total: Math.round(totalHours * 100) / 100
    },
    billableHours: Math.round(toNumber(timeData?.billableHours) * 100) / 100,
    nonBillableHours: Math.round(toNumber(timeData?.nonBillableHours) * 100) / 100,
    expectedHours: Math.round(expectedHours * 100) / 100,
    entryCount: toNumber(timeData?.entryCount),
    projectsCount: toNumber(timeData?.projectsCount),
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    overtimeRate: Math.round(overtimeRate * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100
  };
};

module.exports = {
  buildEmployeeTimeMap,
  buildPayrollTimeSnapshot
};
