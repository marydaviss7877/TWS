import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  BriefcaseIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_LABELS = {
  fixed_shift: 'Fixed Shift',
  flexible_shift: 'Flexible Shift',
  field_worker: 'Field Worker',
  remote_worker: 'Remote Worker',
  hybrid_worker: 'Hybrid Worker',
  exempt: 'Exempt'
};

const STATUS_META = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'work-from-home': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'on-leave': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
};

const toDateInput = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DecisionModal = ({ open, title, reason, setReason, saving, onClose, onConfirm, confirmLabel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card-premium w-full max-w-md p-6 rounded-2xl">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{title}</h4>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="glass-input w-full px-3 py-2 rounded-xl text-sm min-h-[96px]"
          placeholder="Enter reason / note..."
        />
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={onClose} className="flex-1 glass-button px-4 py-2 rounded-xl" disabled={saving}>Cancel</button>
          <button type="button" onClick={onConfirm} className="flex-1 glass-button px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white" disabled={saving}>
            {saving ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const AttendanceManagement = () => {
  const { tenantSlug } = useParams();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [config, setConfig] = useState(null);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [filters, setFilters] = useState({
    fromDate: toDateInput(new Date()),
    toDate: toDateInput(new Date()),
    department: '',
    status: '',
    category: '',
    search: ''
  });

  const [editingRecord, setEditingRecord] = useState(null);
  const [punchForm, setPunchForm] = useState({ checkInTime: '', checkOutTime: '', reason: '' });
  const [savingPunch, setSavingPunch] = useState(false);
  const [decisionState, setDecisionState] = useState({ type: null, record: null, reason: '', saving: false });
  const [pendingDecisionNotes, setPendingDecisionNotes] = useState({});

  useEffect(() => {
    if (!authLoading && isAuthenticated && tenantSlug) {
      refreshData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading, filters.fromDate, filters.toDate]);

  const refreshData = async () => {
    if (!isAuthenticated || !tenantSlug) return;
    try {
      setLoading(true);
      const [cfg, report, pending] = await Promise.all([
        tenantApiService.getAttendanceConfig(tenantSlug).catch(() => null),
        tenantApiService.getAttendanceReports(tenantSlug, { from: filters.fromDate, to: filters.toDate }).catch(() => ({ records: [] })),
        tenantApiService.getAttendancePendingCorrections(tenantSlug).catch(() => ({ pending: [], count: 0 }))
      ]);
      setConfig(cfg);
      setRecords(report?.records || []);
      setPendingCorrections(pending?.pending || []);
    } catch (err) {
      console.error('Error loading attendance management data:', err);
      toast.error('Failed to load attendance data');
      setRecords([]);
      setPendingCorrections([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const dept = (r.employeeInfo?.department || '').toLowerCase();
      const category = (r.employeeInfo?.attendanceCategory || '').toLowerCase();
      const name = (r.userId?.fullName || r.userId?.email || r.employeeId || '').toLowerCase();
      if (filters.department && dept !== filters.department.toLowerCase()) return false;
      if (filters.status && (r.status || '').toLowerCase() !== filters.status.toLowerCase()) return false;
      if (filters.category && category !== filters.category.toLowerCase()) return false;
      if (filters.search && !name.includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [records, filters]);

  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => ['present', 'work-from-home'].includes(r.status)).length;
    const absent = filteredRecords.filter((r) => r.status === 'absent').length;
    const late = filteredRecords.filter((r) => r.status === 'late').length;
    const checkedInNow = filteredRecords.filter((r) => r.checkIn?.timestamp && !r.checkOut?.timestamp).length;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;
    return {
      present,
      absent,
      late,
      checkedInNow,
      correctionPending: pendingCorrections.length,
      attendanceRate: attendanceRate.toFixed(1)
    };
  }, [filteredRecords, pendingCorrections]);

  const uniqueDepartments = [...new Set(records.map((r) => r.employeeInfo?.department).filter(Boolean))];
  const uniqueCategories = [...new Set(records.map((r) => r.employeeInfo?.attendanceCategory).filter(Boolean))];

  const calendarData = useMemo(() => {
    const byDate = {};
    const byDeptDate = {};
    filteredRecords.forEach((r) => {
      const dk = toDateInput(r.date);
      if (!byDate[dk]) byDate[dk] = { total: 0, present: 0, absent: 0, late: 0 };
      byDate[dk].total += 1;
      if (r.status === 'absent') byDate[dk].absent += 1;
      else if (r.status === 'late') byDate[dk].late += 1;
      else byDate[dk].present += 1;

      const dept = r.employeeInfo?.department || 'Unknown';
      byDeptDate[dept] = byDeptDate[dept] || {};
      byDeptDate[dept][dk] = (byDeptDate[dept][dk] || 0) + 1;
    });
    return { byDate, byDeptDate };
  }, [filteredRecords]);

  const calendarDays = useMemo(() => {
    const base = new Date(filters.fromDate);
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const firstWeekday = first.getDay();
    const placeholders = Array.from({ length: firstWeekday }).map((_, i) => ({ key: `ph-${i}`, placeholder: true }));
    const days = Array.from({ length: last.getDate() }).map((_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), i + 1);
      const key = toDateInput(d);
      return { key, day: i + 1, stats: calendarData.byDate[key] || null };
    });
    return [...placeholders, ...days];
  }, [calendarData.byDate, filters.fromDate]);

  const openEditPunch = (record) => {
    setEditingRecord(record);
    setPunchForm({
      checkInTime: record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toTimeString().slice(0, 5) : '',
      checkOutTime: record.checkOut?.timestamp ? new Date(record.checkOut.timestamp).toTimeString().slice(0, 5) : '',
      reason: record.checkIn?.notes || record.checkOut?.notes || ''
    });
  };

  const saveEditPunch = async () => {
    if (!editingRecord?._id) return;
    if (!punchForm.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      setSavingPunch(true);
      await tenantApiService.updateAttendancePunch(tenantSlug, editingRecord._id, {
        checkInTime: punchForm.checkInTime || undefined,
        checkOutTime: punchForm.checkOutTime || undefined,
        reason: punchForm.reason
      });
      toast.success('Punch updated');
      setEditingRecord(null);
      await refreshData();
    } catch (err) {
      toast.error(err?.message || 'Failed to update punch');
    } finally {
      setSavingPunch(false);
    }
  };

  const openDecisionModal = (type, record) => {
    setDecisionState({ type, record, reason: '', saving: false });
  };

  const applyDecisionModal = async () => {
    const { type, record, reason } = decisionState;
    if (!record?._id) return;
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      setDecisionState((s) => ({ ...s, saving: true }));
      if (type === 'mark_absent') {
        await tenantApiService.markAttendanceAbsent(tenantSlug, record._id, reason);
        toast.success('Marked absent');
      } else if (type === 'request_correction') {
        await tenantApiService.requestAttendanceCorrectionOnBehalf(tenantSlug, record._id, reason);
        toast.success('Correction requested on behalf');
      }
      setDecisionState({ type: null, record: null, reason: '', saving: false });
      await refreshData();
    } catch (err) {
      toast.error(err?.message || 'Action failed');
      setDecisionState((s) => ({ ...s, saving: false }));
    }
  };

  const decideCorrectionFromQueue = async (item, status) => {
    const note = pendingDecisionNotes[item.correctionId]?.trim();
    try {
      await tenantApiService.decideAttendanceCorrection(
        tenantSlug,
        item.attendanceId,
        item.correctionId,
        status,
        note || (status === 'approved' ? 'Approved from pending corrections queue' : 'Rejected from pending corrections queue')
      );
      setPendingDecisionNotes((prev) => {
        const next = { ...prev };
        delete next[item.correctionId];
        return next;
      });
      toast.success(`Correction ${status}`);
      await refreshData();
    } catch (err) {
      toast.error(err?.message || `Failed to ${status} correction`);
    }
  };

  const openAudit = async (record) => {
    try {
      setSelectedRecord(record);
      const data = await tenantApiService.getAttendanceAuditTrail(tenantSlug, record._id);
      setAuditData(data);
      setShowAuditModal(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to load audit trail');
    }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const runBulk = async (action) => {
    if (!selectedIds.length) {
      toast.error('Select at least one record');
      return;
    }
    try {
      await tenantApiService.bulkAttendanceAction(tenantSlug, { action, attendanceIds: selectedIds });
      toast.success('Bulk action completed');
      setSelectedIds([]);
      await refreshData();
    } catch (err) {
      toast.error(err?.message || 'Bulk action failed');
    }
  };

  const exportSelected = async () => {
    const selectedSet = new Set(selectedIds);
    const selectedRows = filteredRecords.filter((r) => selectedSet.has(r._id));
    if (!selectedRows.length) {
      toast.error('Select records to export');
      return;
    }
    const headers = ['Date', 'Employee', 'Department', 'Category', 'Status', 'CheckIn', 'CheckOut', 'Hours'];
    const rows = selectedRows.map((r) => [
      toDateInput(r.date),
      r.userId?.fullName || r.userId?.email || r.employeeId || '-',
      r.employeeInfo?.department || '-',
      CATEGORY_LABELS[r.employeeInfo?.attendanceCategory] || r.employeeInfo?.attendanceCategory || '-',
      r.status || '-',
      r.checkIn?.timestamp ? new Date(r.checkIn.timestamp).toLocaleTimeString() : '-',
      r.checkOut?.timestamp ? new Date(r.checkOut.timestamp).toLocaleTimeString() : '-',
      r.durationMinutes != null ? (r.durationMinutes / 60).toFixed(2) : '-'
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-selected-${filters.fromDate}-${filters.toDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Export generated');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="glass-card-premium p-6">
        <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">HR Attendance Operations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Balanced command center for daily operations, correction workflows, and compliance auditability.
        </p>
      </div>

      <div className="glass-card-premium p-4 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Pending Corrections: <span className="font-bold">{kpis.correctionPending}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Keep correction backlog near zero to avoid payroll delays.</p>
          </div>
          <button type="button" onClick={() => setShowPendingModal(true)} className="glass-button px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2">
            <EyeIcon className="w-4 h-4" />
            Review Queue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Present', value: kpis.present, icon: CheckCircleIcon, cls: 'from-green-500 to-emerald-600' },
          { label: 'Absent', value: kpis.absent, icon: XCircleIcon, cls: 'from-red-500 to-pink-600' },
          { label: 'Late', value: kpis.late, icon: ClockIcon, cls: 'from-amber-500 to-orange-600' },
          { label: 'Checked-In Now', value: kpis.checkedInNow, icon: BriefcaseIcon, cls: 'from-indigo-500 to-blue-600' },
          { label: 'Corrections Pending', value: kpis.correctionPending, icon: ExclamationTriangleIcon, cls: 'from-violet-500 to-purple-600' },
          { label: 'Attendance Rate', value: `${kpis.attendanceRate}%`, icon: CalendarIcon, cls: 'from-cyan-500 to-blue-600' }
        ].map((card) => (
          <div key={card.label} className="glass-card-premium p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.cls} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card-premium p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))} className="glass-input px-3 py-2 rounded-lg text-sm" />
          <input type="date" value={filters.toDate} onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))} className="glass-input px-3 py-2 rounded-lg text-sm" />
          <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className="glass-input px-3 py-2 rounded-lg text-sm">
            <option value="">All departments</option>
            {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="glass-input px-3 py-2 rounded-lg text-sm">
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="work-from-home">WFH</option>
            <option value="on-leave">On Leave</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="glass-input px-3 py-2 rounded-lg text-sm">
            <option value="">All categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="glass-input w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              placeholder="Search by employee name..."
            />
          </div>
          <button type="button" onClick={refreshData} className="glass-button px-3 py-2 rounded-lg text-sm">Refresh</button>
          <button type="button" onClick={exportSelected} className="glass-button px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export Selected
          </button>
        </div>
      </div>

      <div className="glass-card-premium p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Org Calendar + Department Heatmap</h3>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEK_DAYS.map((d) => <p key={d} className="text-xs text-center text-gray-500 dark:text-gray-400 font-semibold uppercase">{d}</p>)}
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {calendarDays.map((day) => day.placeholder ? (
            <div key={day.key} className="h-14 rounded-lg" />
          ) : (
            <div key={day.key} className="h-14 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{day.day}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                {day.stats ? `P:${day.stats.present} A:${day.stats.absent}` : 'No logs'}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-500 uppercase py-2">Department</th>
                {Array.from({ length: 7 }).map((_, idx) => {
                  const d = new Date(filters.fromDate);
                  d.setDate(d.getDate() + idx);
                  return <th key={idx} className="text-left text-xs text-gray-500 uppercase py-2">{toDateInput(d).slice(5)}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {Object.keys(calendarData.byDeptDate).slice(0, 8).map((dept) => (
                <tr key={dept}>
                  <td className="py-2 text-sm text-gray-700 dark:text-gray-300">{dept}</td>
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date(filters.fromDate);
                    d.setDate(d.getDate() + idx);
                    const key = toDateInput(d);
                    const count = calendarData.byDeptDate[dept]?.[key] || 0;
                    const cls = count >= 5 ? 'bg-emerald-500' : count >= 3 ? 'bg-emerald-400' : count > 0 ? 'bg-emerald-200' : 'bg-gray-200 dark:bg-gray-700';
                    return <td key={key} className="py-2"><span className={`inline-block w-6 h-6 rounded ${cls}`} title={`${dept} ${key}: ${count}`} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <button type="button" onClick={() => runBulk('approve_corrections')} className="text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700">Bulk Approve Corrections</button>
          <button type="button" onClick={() => runBulk('mark_absent')} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Bulk Mark Absent</button>
          <button type="button" onClick={() => runBulk('mark_present')} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Bulk Mark Present</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"><input type="checkbox" checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length} onChange={(e) => setSelectedIds(e.target.checked ? filteredRecords.map((r) => r._id) : [])} /></th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Check In</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Audit</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.map((record) => {
                const edited = (record.correctionRequests || []).some((cr) => cr.status === 'approved');
                return (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.includes(record._id)} onChange={() => toggleSelect(record._id)} /></td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.userId?.fullName || record.userId?.email || record.employeeId || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{record.employeeInfo?.department || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[record.employeeInfo?.attendanceCategory] || record.employeeInfo?.attendanceCategory || '-'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[record.status] || STATUS_META.default}`}>{record.status || '-'}</span></td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toLocaleTimeString() : '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{record.checkOut?.timestamp ? new Date(record.checkOut.timestamp).toLocaleTimeString() : '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{record.durationMinutes != null ? (record.durationMinutes / 60).toFixed(2) : '-'}</td>
                    <td className="px-3 py-2">
                      {edited ? <span className="px-2 py-1 rounded text-[11px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Edited</span> : <span className="px-2 py-1 rounded text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Original</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => openEditPunch(record)} className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 inline-flex items-center gap-1"><PencilSquareIcon className="w-3.5 h-3.5" />Edit Punch</button>
                        <button type="button" onClick={() => openDecisionModal('mark_absent', record)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Mark Absent</button>
                        <button type="button" onClick={() => openDecisionModal('request_correction', record)} className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">Request Correction</button>
                        <button type="button" onClick={() => openAudit(record)} className="text-xs px-2 py-1 rounded bg-slate-600 text-white hover:bg-slate-700">Audit Trail</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No attendance records match current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {config && (config.departments?.length > 0 || config.attendanceCategories?.length > 0) && (
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4" />
            Department and attendance category reference
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              {config.departments?.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{d.style}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {config.attendanceCategories?.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                  <span className="text-gray-500 dark:text-gray-400">{c.requiresPunch ? 'Punch required' : 'Exempt'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card-premium w-full max-w-md p-6 rounded-2xl">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Edit Punch</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {(editingRecord.userId?.fullName || editingRecord.userId?.email || editingRecord.employeeId)} - {new Date(editingRecord.date).toLocaleDateString()}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Check-In Time</label>
                <input type="time" value={punchForm.checkInTime} onChange={(e) => setPunchForm((p) => ({ ...p, checkInTime: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Check-Out Time</label>
                <input type="time" value={punchForm.checkOutTime} onChange={(e) => setPunchForm((p) => ({ ...p, checkOutTime: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Reason / Note</label>
                <textarea value={punchForm.reason} onChange={(e) => setPunchForm((p) => ({ ...p, reason: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-xl text-sm min-h-[88px]" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 glass-button px-4 py-2 rounded-xl" disabled={savingPunch}>Cancel</button>
              <button type="button" onClick={saveEditPunch} className="flex-1 glass-button px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white" disabled={savingPunch}>
                {savingPunch ? 'Saving...' : 'Save Punch'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DecisionModal
        open={!!decisionState.type}
        title={decisionState.type === 'mark_absent' ? 'Mark Employee Absent' : 'Request Correction on Behalf'}
        reason={decisionState.reason}
        setReason={(value) => setDecisionState((s) => ({ ...s, reason: value }))}
        saving={decisionState.saving}
        onClose={() => setDecisionState({ type: null, record: null, reason: '', saving: false })}
        onConfirm={applyDecisionModal}
        confirmLabel={decisionState.type === 'mark_absent' ? 'Mark Absent' : 'Create Request'}
      />

      {showPendingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card-premium w-full max-w-4xl p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Pending Corrections</h4>
              <button type="button" onClick={() => setShowPendingModal(false)} className="glass-button px-3 py-1 rounded-lg text-sm">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Requested At</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Decision Note</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingCorrections.map((p) => (
                    <tr key={p.correctionId}>
                      <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">{p.employeeName}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{p.reason}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{p.requestedAt ? new Date(p.requestedAt).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={pendingDecisionNotes[p.correctionId] || ''}
                          onChange={(e) => setPendingDecisionNotes((prev) => ({ ...prev, [p.correctionId]: e.target.value }))}
                          className="glass-input w-full min-w-[220px] px-2 py-1.5 rounded-lg text-xs"
                          placeholder="Optional note for approve/reject"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => decideCorrectionFromQueue(p, 'approved')} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Approve</button>
                          <button type="button" onClick={() => decideCorrectionFromQueue(p, 'rejected')} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingCorrections.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">No pending corrections.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card-premium w-full max-w-3xl p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Audit Trail</h4>
              <button type="button" onClick={() => setShowAuditModal(false)} className="glass-button px-3 py-1 rounded-lg text-sm">Close</button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {selectedRecord?.userId?.fullName || selectedRecord?.userId?.email || selectedRecord?.employeeId}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-auto">
              <div>
                <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Corrections</h5>
                <div className="space-y-2">
                  {(auditData?.correctionTrail || []).map((item) => (
                    <div key={item.id} className="p-2 rounded border border-gray-200 dark:border-gray-700 text-xs">
                      <p className="font-medium">{item.status}</p>
                      <p>{item.reason}</p>
                      <p className="text-gray-500">{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">System Audit Logs</h5>
                <div className="space-y-2">
                  {(auditData?.auditLogs || []).map((log) => (
                    <div key={log._id} className="p-2 rounded border border-gray-200 dark:border-gray-700 text-xs">
                      <p className="font-medium">{log.action}</p>
                      <p>{log.userId?.fullName || log.userId?.email || '-'}</p>
                      <p className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
