import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  PlayIcon,
  StopIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_META = {
  present: { label: 'Present', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  late: { label: 'Late', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  absent: { label: 'Absent', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  'work-from-home': { label: 'WFH', dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  'on-leave': { label: 'On Leave', dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  holiday: { label: 'Holiday', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  sick: { label: 'Sick', dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  default: { label: 'Unknown', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' }
};

function toDateOnly(value) {
  return new Date(value).toISOString().split('T')[0];
}

function mapRecord(record) {
  const date = record.date ? new Date(record.date) : null;
  const checkInTime = record.checkIn?.timestamp ? new Date(record.checkIn.timestamp) : null;
  const checkOutTime = record.checkOut?.timestamp ? new Date(record.checkOut.timestamp) : null;
  const hoursWorked = record.durationMinutes != null ? record.durationMinutes / 60 : null;
  const notes = record.checkIn?.notes || record.checkOut?.notes;
  const statusMeta = STATUS_META[record.status] || STATUS_META.default;
  return {
    date,
    dateKey: date ? toDateOnly(date) : null,
    id: record._id,
    status: record.status || 'absent',
    statusLabel: statusMeta.label,
    statusDot: statusMeta.dot,
    statusBadge: statusMeta.badge,
    raw: record,
    checkInTime: checkInTime ? checkInTime.toISOString() : null,
    checkOutTime: checkOutTime ? checkOutTime.toISOString() : null,
    hoursWorked,
    notes
  };
}

const EmployeeAttendanceView = ({ tenantSlug }) => {
  const { user } = useAuth();
  const { user: tenantUser } = useTenantAuth();
  const effectiveUser = tenantUser || user;
  const employeeId = effectiveUser?.employeeId || effectiveUser?.id || effectiveUser?._id;

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, onTime: 0, totalDays: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayRecord, setDayRecord] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month, 0), [year, month]);
  const firstWeekDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  useEffect(() => {
    if (tenantSlug && employeeId) {
      fetchAttendance();
      fetchToday();
    } else {
      setLoading(false);
    }
  }, [tenantSlug, employeeId, selectedMonth]);

  useEffect(() => {
    const selected = attendance.find((record) => record.dateKey === selectedDate) || null;
    setDayRecord(selected);
  }, [attendance, selectedDate]);

  const fetchToday = async () => {
    if (!tenantSlug || !employeeId) return;
    try {
      const data = await tenantApiService.getAttendanceData(tenantSlug, { date: todayDate, employeeId });
      const records = data?.records || [];
      setTodayRecord(records[0] || null);
    } catch (_) {
      setTodayRecord(null);
    }
  };

  const fetchAttendance = async () => {
    if (!tenantSlug || !employeeId) return;
    try {
      setLoading(true);
      const data = await tenantApiService.getAttendanceData(tenantSlug, {
        employeeId,
        month: selectedMonth
      });
      const records = (data?.records || []).map(mapRecord);
      setAttendance(records);
      calculateStats(records);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to load attendance');
      setAttendance([]);
      setStats({ present: 0, absent: 0, late: 0, onTime: 0, totalDays: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!tenantSlug || !employeeId || punchLoading) return;
    setPunchLoading(true);
    try {
      const checkInResult = await tenantApiService.checkIn(tenantSlug, employeeId, {});
      if (!checkInResult) throw new Error('Check-in failed');
      toast.success('Check-in recorded');
      await fetchToday();
      await fetchAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-in failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!tenantSlug || !employeeId || punchLoading) return;
    setPunchLoading(true);
    try {
      const checkOutResult = await tenantApiService.checkOut(tenantSlug, employeeId, {});
      if (!checkOutResult) throw new Error('Check-out failed');
      toast.success('Check-out recorded');
      await fetchToday();
      await fetchAttendance();
    } catch (err) {
      toast.error(err?.message || 'Check-out failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const calculateStats = (records) => {
    const next = { present: 0, absent: 0, late: 0, onTime: 0, totalDays: records.length };
    records.forEach((record) => {
      if (record.status === 'present' || record.status === 'work-from-home') {
        next.present += 1;
        if (record.status === 'late') next.late += 1;
        else if (record.checkInTime) next.onTime += 1;
      } else if (record.status === 'late') {
        next.present += 1;
        next.late += 1;
      } else if (record.status === 'absent') {
        next.absent += 1;
      }
    });
    setStats(next);
  };

  const buildCalendarDays = () => {
    const placeholders = Array.from({ length: firstWeekDay }).map((_, idx) => ({
      key: `ph-${idx}`,
      isPlaceholder: true
    }));
    const days = Array.from({ length: daysInMonth }).map((_, idx) => {
      const dayNumber = idx + 1;
      const date = new Date(year, month - 1, dayNumber);
      const dateKey = toDateOnly(date);
      const record = attendance.find((item) => item.dateKey === dateKey) || null;
      return {
        key: dateKey,
        isPlaceholder: false,
        dayNumber,
        dateKey,
        isToday: dateKey === todayDate,
        isSelected: dateKey === selectedDate,
        record
      };
    });
    return [...placeholders, ...days];
  };

  const streak = useMemo(() => {
    if (!attendance.length) return 0;
    const presentLike = new Set(['present', 'late', 'work-from-home']);
    const sorted = [...attendance]
      .filter((r) => presentLike.has(r.status))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!sorted.length) return 0;
    let cursor = new Date(todayDate);
    let count = 0;
    const presentDays = new Set(sorted.map((r) => r.dateKey));
    while (presentDays.has(toDateOnly(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [attendance, todayDate]);

  const heatmapLevels = useMemo(() => {
    const dailyHours = attendance.map((r) => r.hoursWorked || 0);
    const maxHours = Math.max(...dailyHours, 0);
    return attendance.map((record) => {
      const hours = record.hoursWorked || 0;
      const ratio = maxHours > 0 ? hours / maxHours : 0;
      let cls = 'bg-gray-200 dark:bg-gray-700';
      if (record.status === 'absent') cls = 'bg-red-200 dark:bg-red-900/40';
      else if (ratio > 0.75) cls = 'bg-emerald-500';
      else if (ratio > 0.5) cls = 'bg-emerald-400';
      else if (ratio > 0.25) cls = 'bg-emerald-300';
      else if (hours > 0) cls = 'bg-emerald-200';
      return { dateKey: record.dateKey, cls, hours };
    });
  }, [attendance]);

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (record) => {
    const badgeClass = record?.statusBadge || STATUS_META.default.badge;
    const label = record?.statusLabel || record?.status || 'N/A';
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}`}>{label}</span>;
  };

  const submitCorrectionRequest = async () => {
    if (!dayRecord?.id) {
      toast.error('Select a day with an attendance record first');
      return;
    }
    if (!correctionReason.trim()) {
      toast.error('Please enter a correction reason');
      return;
    }
    try {
      setCorrectionLoading(true);
      const res = await fetch(`/api/attendance/${dayRecord.id}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: correctionReason.trim() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Correction request failed');
      }
      toast.success('Correction request submitted');
      setCorrectionReason('');
    } catch (error) {
      toast.error(error.message || 'Correction request failed');
    } finally {
      setCorrectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const hasCheckedIn = todayRecord?.checkIn?.timestamp;
  const hasCheckedOut = todayRecord?.checkOut?.timestamp;
  const canPunch = !todayRecord?.employeeInfo?.isAttendanceExempt && todayRecord?.employeeInfo?.attendanceCategory !== 'exempt';
  const calendarDays = buildCalendarDays();
  const selectedLabel = dayRecord?.date
    ? new Date(dayRecord.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : selectedDate;
  const monthlyPresentRate = stats.totalDays > 0 ? ((stats.present / stats.totalDays) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card-premium p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">My Attendance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track daily punch-ins, review calendar trends, and request corrections.
            </p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setSelectedDate(`${e.target.value}-01`);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Today - {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Check In:</span>
            <span className="font-medium text-gray-900 dark:text-white">{hasCheckedIn ? formatTime(todayRecord.checkIn.timestamp) : '-'}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <StopIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Check Out:</span>
            <span className="font-medium text-gray-900 dark:text-white">{hasCheckedOut ? formatTime(todayRecord.checkOut.timestamp) : '-'}</span>
          </div>
          {canPunch && (
            <div className="flex items-center gap-2">
              {!hasCheckedIn && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="w-5 h-5" />
                  {punchLoading ? 'Recording...' : 'Check In'}
                </button>
              )}
              {hasCheckedIn && !hasCheckedOut && (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <StopIcon className="w-5 h-5" />
                  {punchLoading ? 'Recording...' : 'Check Out'}
                </button>
              )}
            </div>
          )}
          {todayRecord?.employeeInfo?.isAttendanceExempt && (
            <span className="text-sm text-gray-500 dark:text-gray-400 italic">Exempt - no daily punch required</span>
          )}
        </div>

        {todayRecord && (
          <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Today Timeline</p>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><PlayIcon className="w-4 h-4 text-emerald-500" /> Check In</span>
                <span>{formatTime(todayRecord.checkIn?.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><StopIcon className="w-4 h-4 text-blue-500" /> Check Out</span>
                <span>{formatTime(todayRecord.checkOut?.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><ClockIcon className="w-4 h-4 text-purple-500" /> Hours</span>
                <span>{todayRecord.durationMinutes ? `${(todayRecord.durationMinutes / 60).toFixed(2)} hrs` : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Present Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthlyPresentRate}%</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="glass-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Consecutive Streak</p>
              <p className="text-2xl font-bold text-orange-600 inline-flex items-center gap-2">{streak} <FireIcon className="w-6 h-6" /></p>
            </div>
            <FireIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="glass-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Present Days</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div className="glass-card-premium p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Missed/Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar View</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STATUS_META).filter((k) => k !== 'default').map((status) => (
                <span key={status} className="text-[11px] text-gray-600 dark:text-gray-300 inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_META[status].dot}`} />
                  {STATUS_META[status].label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {WEEK_DAYS.map((day) => (
              <p key={day} className="text-xs text-center text-gray-500 dark:text-gray-400 font-semibold uppercase">{day}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              if (day.isPlaceholder) return <div key={day.key} className="h-16 rounded-lg bg-transparent" />;
              return (
                <button
                  type="button"
                  key={day.key}
                  onClick={() => setSelectedDate(day.dateKey)}
                  className={`h-16 rounded-xl border transition-all p-2 text-left ${
                    day.isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-sm font-semibold ${day.isToday ? 'text-purple-600 dark:text-purple-300' : 'text-gray-700 dark:text-gray-200'}`}>{day.dayNumber}</span>
                    {day.record && <span className={`w-2 h-2 rounded-full ${day.record.statusDot}`} />}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 truncate">{day.record ? day.record.statusLabel : 'No log'}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Monthly Heatmap</h4>
            <div className="flex flex-wrap gap-1.5">
              {heatmapLevels.map((cell) => (
                <span
                  key={cell.dateKey}
                  title={`${cell.dateKey}: ${cell.hours.toFixed(2)} hours`}
                  className={`w-4 h-4 rounded ${cell.cls}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Selected Day</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedLabel}</p>
          {dayRecord ? (
            <div className="space-y-4">
              <div>{getStatusBadge(dayRecord)}</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between"><span>Check In</span><span>{formatTime(dayRecord.checkInTime)}</span></div>
                <div className="flex items-center justify-between"><span>Check Out</span><span>{formatTime(dayRecord.checkOutTime)}</span></div>
                <div className="flex items-center justify-between"><span>Hours</span><span>{dayRecord.hoursWorked ? `${dayRecord.hoursWorked.toFixed(2)} hrs` : 'N/A'}</span></div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                  <p>{dayRecord.notes || 'No notes for this day.'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 inline-block mr-1" />
                  Request Correction
                </label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full min-h-[90px] px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
                  placeholder="Example: Missed punch at 9:05 AM due to VPN reconnect."
                />
                <button
                  type="button"
                  onClick={submitCorrectionRequest}
                  disabled={correctionLoading}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {correctionLoading ? 'Submitting...' : 'Submit Correction Request'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a date with attendance data from the calendar.</p>
          )}
        </div>
      </div>

      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-200 dark:divide-gray-800">
              {attendance.length > 0 ? attendance.map((record, index) => (
                <tr
                  key={index}
                  className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 ${selectedDate === record.dateKey ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                  onClick={() => setSelectedDate(record.dateKey)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatTime(record.checkInTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatTime(record.checkOutTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.hoursWorked ? `${record.hoursWorked.toFixed(2)} hrs` : 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{record.notes || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No attendance records found for this month</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceView;
