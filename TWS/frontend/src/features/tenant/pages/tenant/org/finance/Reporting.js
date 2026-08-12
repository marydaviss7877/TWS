import React, { useState } from 'react';
import {
  ChartPieIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  PrinterIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { useTenantCurrency } from '../../../../../../shared/hooks/useTenantCurrency';
import { formatCurrency as formatCurrencyBase } from '../../../../../../shared/utils/currency';

const REPORT_CATALOG = [
  {
    id: 'profit-loss',
    name: 'Profit & Loss Statement',
    description: 'Revenue, expenses, and net income for the selected period',
    icon: ChartBarIcon,
    category: 'Financial Statements',
    color: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' }
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities, and equity at a specific point in time',
    icon: DocumentTextIcon,
    category: 'Financial Statements',
    color: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' }
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Cash inflows and outflows from operating activities with forecasts',
    icon: CurrencyDollarIcon,
    category: 'Financial Statements',
    color: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-600 dark:text-cyan-400' }
  },
  {
    id: 'project-profitability',
    name: 'Project Profitability',
    description: 'Revenue, costs, and margin analysis per project',
    icon: ChartPieIcon,
    category: 'Project Reports',
    color: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'text-violet-600 dark:text-violet-400' }
  },
  {
    id: 'client-analysis',
    name: 'Client Analysis',
    description: 'Revenue, invoicing, and payment breakdown by client',
    icon: UserGroupIcon,
    category: 'Client Reports',
    color: { bg: 'bg-pink-50 dark:bg-pink-900/20', icon: 'text-pink-600 dark:text-pink-400' }
  },
  {
    id: 'time-tracking',
    name: 'Time Tracking Report',
    description: 'Hours logged by employee and project for the period',
    icon: ClockIcon,
    category: 'HR & Operations',
    color: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' }
  },
  {
    id: 'expense-analysis',
    name: 'Expense Analysis',
    description: 'Expense breakdown by category with percentage share',
    icon: ArrowTrendingDownIcon,
    category: 'Expense Reports',
    color: { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'text-rose-600 dark:text-rose-400' }
  },
  {
    id: 'revenue-trends',
    name: 'Revenue Trends',
    description: 'Monthly revenue growth and trend analysis over the period',
    icon: ArrowTrendingUpIcon,
    category: 'Trend Reports',
    color: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' }
  }
];

const CATEGORY_COLORS = {
  'Financial Statements': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Project Reports':      'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  'Client Reports':       'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'HR & Operations':      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Expense Reports':      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Trend Reports':        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
};

// The report sub-components below are rendered as plain presentational children of
// Reporting, sharing this module-scoped fmt() rather than each taking a currency prop.
// currentReportCurrency is set once per Reporting render, before any child renders it —
// safe within React's synchronous render pass — so every report reflects the org's
// configured currency without threading a prop through nine components.
let currentReportCurrency = 'USD';
const fmt = (n) => formatCurrencyBase(n || 0, currentReportCurrency);
const fmtN = (n, dp = 0) => (+n || 0).toFixed(dp);

// ─── Sub-components for each report type ───────────────────────────────────

const ReportHeader = ({ title, period, onPrint }) => (
  <div className="flex items-start justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
        <BuildingOffice2Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{period}</p>
      </div>
    </div>
    <button
      onClick={onPrint}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <PrinterIcon className="w-4 h-4" />
      Print
    </button>
  </div>
);

const LineRow = ({ label, amount, bold, indent, highlight }) => (
  <div className={`flex justify-between items-center py-2 ${indent ? 'pl-6' : ''} ${bold ? 'font-semibold' : ''} ${highlight ? 'bg-gray-50 dark:bg-gray-800/50 rounded px-3 py-3 my-1' : 'border-b border-gray-100 dark:border-gray-800'}`}>
    <span className={`text-sm ${bold ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
    <span className={`text-sm font-mono ${bold ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-800 dark:text-gray-200'}`}>{fmt(amount)}</span>
  </div>
);

const SectionTitle = ({ children, color = 'text-gray-700 dark:text-gray-300' }) => (
  <div className={`text-xs font-bold uppercase tracking-widest ${color} mt-6 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1`}>
    {children}
  </div>
);

// Profit & Loss
const PnLReport = ({ data }) => {
  const margin = data.grossMargin || 0;
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: fmt(data.revenue?.total), color: 'text-green-600 dark:text-green-400' },
          { label: 'Total Expenses', value: fmt(data.expenses?.total), color: 'text-red-600 dark:text-red-400' },
          { label: 'Net Profit', value: fmt(data.netProfit), color: data.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400' }
        ].map(c => (
          <div key={c.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <SectionTitle color="text-green-700 dark:text-green-400">Revenue</SectionTitle>
      {data.revenue?.breakdown?.length > 0
        ? data.revenue.breakdown.map((r, i) => <LineRow key={i} label={r.category} amount={r.amount} indent />)
        : <p className="text-sm text-gray-400 italic pl-6 py-2">No revenue recorded for this period.</p>
      }
      <LineRow label="Total Revenue" amount={data.revenue?.total} bold highlight />

      <SectionTitle color="text-red-700 dark:text-red-400">Expenses</SectionTitle>
      {data.expenses?.breakdown?.length > 0
        ? data.expenses.breakdown.map((r, i) => <LineRow key={i} label={r.category} amount={r.amount} indent />)
        : <p className="text-sm text-gray-400 italic pl-6 py-2">No expenses recorded for this period.</p>
      }
      <LineRow label="Total Expenses" amount={data.expenses?.total} bold highlight />

      <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-indigo-900 dark:text-indigo-200">Net Profit / (Loss)</span>
          <span className={`text-2xl font-bold font-mono ${data.netProfit >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-600'}`}>{fmt(data.netProfit)}</span>
        </div>
        <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Profit Margin: {fmtN(margin, 1)}%</p>
      </div>
    </div>
  );
};

// Balance Sheet
const BalanceSheetReport = ({ data }) => (
  <div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[
        { label: 'Total Assets', value: fmt(data.assets?.total), color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Total Liabilities', value: fmt(data.liabilities?.total), color: 'text-red-600 dark:text-red-400' },
        { label: 'Total Equity', value: fmt(data.equity?.total), color: 'text-green-600 dark:text-green-400' }
      ].map(c => (
        <div key={c.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
          <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <SectionTitle color="text-blue-700 dark:text-blue-400">Assets</SectionTitle>
        {data.assets?.items?.length > 0
          ? data.assets.items.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-400 mr-2 font-mono">{a.code}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{a.name}</span>
                </div>
                <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{fmt(a.balance)}</span>
              </div>
            ))
          : <p className="text-sm text-gray-400 italic py-2">No asset accounts found.</p>
        }
        <LineRow label="Total Assets" amount={data.assets?.total} bold highlight />

        <div className="mt-6">
          <SectionTitle color="text-red-700 dark:text-red-400">Liabilities</SectionTitle>
          {data.liabilities?.items?.length > 0
            ? data.liabilities.items.map((a, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <span className="text-xs text-gray-400 mr-2 font-mono">{a.code}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{a.name}</span>
                  </div>
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{fmt(a.balance)}</span>
                </div>
              ))
            : <p className="text-sm text-gray-400 italic py-2">No liability accounts found.</p>
          }
          <LineRow label="Total Liabilities" amount={data.liabilities?.total} bold highlight />
        </div>
      </div>

      <div>
        <SectionTitle color="text-green-700 dark:text-green-400">Equity</SectionTitle>
        {data.equity?.items?.length > 0
          ? data.equity.items.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-400 mr-2 font-mono">{a.code}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{a.name}</span>
                </div>
                <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{fmt(a.balance)}</span>
              </div>
            ))
          : <p className="text-sm text-gray-400 italic py-2">No equity accounts found.</p>
        }
        <LineRow label="Total Equity" amount={data.equity?.total} bold highlight />

        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-green-900 dark:text-green-200">Liabilities + Equity</span>
            <span className="text-lg font-bold font-mono text-green-700 dark:text-green-300">{fmt((data.liabilities?.total || 0) + (data.equity?.total || 0))}</span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Should equal Total Assets</p>
        </div>
      </div>
    </div>
  </div>
);

// Cash Flow Statement
const CashFlowReport = ({ data }) => (
  <div>
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { label: 'Total Inflows', value: fmt(data.operating?.inflows), color: 'text-green-600 dark:text-green-400' },
        { label: 'Total Outflows', value: fmt(data.operating?.outflows), color: 'text-red-600 dark:text-red-400' },
        { label: 'Net Cash Flow', value: fmt(data.operating?.net), color: (data.operating?.net || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400' }
      ].map(c => (
        <div key={c.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
          <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>

    <SectionTitle color="text-blue-700 dark:text-blue-400">Monthly Breakdown</SectionTitle>
    {data.monthlyBreakdown?.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Month</th>
              <th className="text-right py-2 px-4 text-xs font-semibold text-green-600 uppercase">Inflows</th>
              <th className="text-right py-2 px-4 text-xs font-semibold text-red-600 uppercase">Outflows</th>
              <th className="text-right py-2 pl-4 text-xs font-semibold text-blue-600 uppercase">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.monthlyBreakdown.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{row.month}</td>
                <td className="py-2.5 px-4 text-right font-mono text-green-600 dark:text-green-400">{fmt(row.inflow)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-red-600 dark:text-red-400">{fmt(row.outflow)}</td>
                <td className={`py-2.5 pl-4 text-right font-mono font-semibold ${(row.inflow - row.outflow) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(row.inflow - row.outflow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <p className="text-sm text-gray-400 italic py-2">No transaction data for this period.</p>}

    {data.upcomingForecasts?.length > 0 && (
      <>
        <SectionTitle color="text-purple-700 dark:text-purple-400">Upcoming Forecasts (Next 90 Days)</SectionTitle>
        <div className="space-y-2">
          {data.upcomingForecasts.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${f.type === 'inflow' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{f.category || 'Forecast'}</span>
                <span className="text-xs text-gray-400">{new Date(f.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.confidence === 'high' ? 'bg-green-100 text-green-700' : f.confidence === 'low' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{f.confidence}</span>
                <span className={`text-sm font-mono font-medium ${f.type === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{f.type === 'inflow' ? '+' : '-'}{fmt(f.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

// Project Profitability
const ProjectProfitabilityReport = ({ data }) => (
  <div>
    {data.projects?.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {['Project', 'Client', 'Budget', 'Revenue', 'Actual Cost', 'Gross Profit', 'Margin', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{p.client}</td>
                <td className="py-3 px-3 font-mono text-gray-700 dark:text-gray-300">{fmt(p.budget)}</td>
                <td className="py-3 px-3 font-mono text-green-600 dark:text-green-400">{fmt(p.revenue)}</td>
                <td className="py-3 px-3 font-mono text-red-600 dark:text-red-400">{fmt(p.costs)}</td>
                <td className={`py-3 px-3 font-mono font-semibold ${p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(p.profit)}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.margin >= 20 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : p.margin >= 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {fmtN(p.margin, 1)}%
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 font-bold">
              <td className="py-3 px-3 text-gray-900 dark:text-white" colSpan={3}>Totals</td>
              <td className="py-3 px-3 font-mono text-green-600 dark:text-green-400">{fmt(data.projects.reduce((s, p) => s + p.revenue, 0))}</td>
              <td className="py-3 px-3 font-mono text-red-600 dark:text-red-400">{fmt(data.projects.reduce((s, p) => s + p.costs, 0))}</td>
              <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">{fmt(data.projects.reduce((s, p) => s + p.profit, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    ) : (
      <EmptyState message="No project costing data available for the selected period." />
    )}
  </div>
);

// Client Analysis
const ClientAnalysisReport = ({ data }) => (
  <div>
    {data.clients?.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {['Client', 'Total Revenue', 'Invoices', 'Avg Invoice', 'Paid', 'Outstanding'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                <td className="py-3 px-3 font-mono font-semibold text-gray-800 dark:text-gray-200">{fmt(c.revenue)}</td>
                <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{c.invoices}</td>
                <td className="py-3 px-3 font-mono text-gray-700 dark:text-gray-300">{fmt(c.avgInvoiceValue)}</td>
                <td className="py-3 px-3 font-mono text-green-600 dark:text-green-400">{fmt(c.paid)}</td>
                <td className={`py-3 px-3 font-mono font-medium ${c.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>{fmt(c.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="No invoice data found for the selected period." />
    )}
  </div>
);

// Time Tracking
const TimeTrackingReport = ({ data }) => (
  <div>
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Hours</p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmtN(data.summary?.totalHours, 1)}h</p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Entries</p>
        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.summary?.totalEntries || 0}</p>
      </div>
    </div>

    <SectionTitle>Breakdown by Employee</SectionTitle>
    {data.byEmployee?.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {['Employee', 'Total Hours', 'Billable Hours', 'Utilization', 'Projects'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.byEmployee.map((e, i) => {
              const utilization = e.hours > 0 ? (e.billable / e.hours) * 100 : 0;
              return (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{e.employee}</td>
                  <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">{fmtN(e.hours, 1)}h</td>
                  <td className="py-3 px-3 font-mono text-green-600 dark:text-green-400">{fmtN(e.billable, 1)}h</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(utilization, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{fmtN(utilization, 0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400 text-xs">{(e.projects || []).join(', ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="No time entries found for the selected period." />
    )}
  </div>
);

// Expense Analysis
const ExpenseAnalysisReport = ({ data }) => (
  <div>
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700 mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Expenses</p>
      <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{fmt(data.total)}</p>
    </div>
    {data.categories?.length > 0 ? (
      <div className="space-y-3">
        {data.categories.map((c, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-700 dark:text-gray-300 truncate">{c.category}</div>
            <div className="flex-1">
              <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all"
                  style={{ width: `${c.percentage}%` }}
                />
              </div>
            </div>
            <div className="text-right w-24 font-mono text-sm text-gray-800 dark:text-gray-200">{fmt(c.amount)}</div>
            <div className="text-right w-12 text-xs text-gray-500">{c.percentage}%</div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState message="No expense data found for the selected period." />
    )}
  </div>
);

// Revenue Trends
const RevenueTrendsReport = ({ data }) => (
  <div>
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Revenue</p>
        <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">{fmt(data.totalRevenue)}</p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly Average</p>
        <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{fmt(data.avgMonthly)}</p>
      </div>
    </div>

    {data.trend?.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {['Month', 'Revenue', 'MoM Growth'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.trend.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{row.label}</td>
                <td className="py-3 px-4 font-mono font-semibold text-green-600 dark:text-green-400">{fmt(row.revenue)}</td>
                <td className="py-3 px-4">
                  {row.growth !== null ? (
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${row.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {row.growth >= 0 ? '▲' : '▼'} {Math.abs(row.growth)}%
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState message="No revenue data found for the selected period." />
    )}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-12">
    <DocumentTextIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting the date range or adding data first.</p>
  </div>
);

const REPORT_RENDERERS = {
  'profit-loss': PnLReport,
  'balance-sheet': BalanceSheetReport,
  'cash-flow': CashFlowReport,
  'project-profitability': ProjectProfitabilityReport,
  'client-analysis': ClientAnalysisReport,
  'time-tracking': TimeTrackingReport,
  'expense-analysis': ExpenseAnalysisReport,
  'revenue-trends': RevenueTrendsReport
};

// ─── Main Component ─────────────────────────────────────────────────────────

const Reporting = () => {
  const tenantSlug = useTenantSlug();
  const currency = useTenantCurrency(tenantSlug);
  currentReportCurrency = currency;
  const [generating, setGenerating] = useState(false);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const generateReport = async (reportId) => {
    setGenerating(true);
    setActiveReportId(reportId);
    setReportData(null);
    try {
      const res = await tenantApiService.generateFinanceReport(tenantSlug, reportId, dateRange.startDate, dateRange.endDate);
      const payload = res?.data || res;
      if (!payload) throw new Error('Empty response');
      setReportData(payload);
    } catch (err) {
      console.error('Report generation failed:', err);
      toast.error('Failed to generate report. Please try again.');
      setActiveReportId(null);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();
  const handleExport = async (format) => {
    try {
      if (!activeReportId) {
        toast.error('Generate a report before exporting.');
        return;
      }

      const exportFormat = format === 'excel' ? 'xlsx' : format;
      const response = await tenantApiService.exportFinanceReport(
        tenantSlug,
        activeReportId,
        exportFormat,
        dateRange.startDate,
        dateRange.endDate
      );
      if (!response || !response.ok) {
        throw new Error('Export request failed.');
      }

      const contentType = response?.headers?.get?.('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        throw new Error(payload?.message || 'Export format is not currently available.');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const backendFilename = filenameMatch?.[1];
      link.href = objectUrl;
      link.download = backendFilename || `${activeReportId}-${dateRange.startDate}-${dateRange.endDate}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error?.message || 'Export failed. Please try again.');
    }
  };

  const ReportRenderer = activeReportId ? REPORT_RENDERERS[activeReportId] : null;
  const activeReportMeta = REPORT_CATALOG.find(r => r.id === activeReportId);

  const grouped = REPORT_CATALOG.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Financial Reports
              </h1>
              <p className="mt-1 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Generate, review, and export professional financial statements and analytics
              </p>
            </div>
            <div className="hidden sm:block w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
              <ChartPieIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(d => ({ ...d, startDate: e.target.value }))}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
              <span className="text-gray-400 text-sm">—</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(d => ({ ...d, endDate: e.target.value }))}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
            </div>
            <span className="text-xs text-gray-400">Select a date range, then click Generate on any report below.</span>
          </div>
        </div>
      </div>

      {/* Report Catalog — grouped by category */}
      {Object.entries(grouped).map(([category, reports]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700'}`}>{category}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              const isActive = activeReportId === report.id;
              return (
                <div
                  key={report.id}
                  className={`glass-card-premium rounded-xl p-5 border-2 transition-all duration-200 ${isActive ? 'border-indigo-500 dark:border-indigo-400' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 ${report.color.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${report.color.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{report.name}</h3>
                    </div>
                    {isActive && reportData && (
                      <CheckCircleIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{report.description}</p>
                  <button
                    onClick={() => generateReport(report.id)}
                    disabled={generating}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      generating && activeReportId === report.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-wait'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {generating && activeReportId === report.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full tws-loading-pulse" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Report Output Panel */}
      {reportData && ReportRenderer && (
        <div className="glass-card-premium rounded-xl print:shadow-none" id="report-output">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {activeReportMeta && (
                  <div className={`w-9 h-9 ${activeReportMeta.color.bg} rounded-lg flex items-center justify-center`}>
                    {React.createElement(activeReportMeta.icon, { className: `w-5 h-5 ${activeReportMeta.color.icon}` })}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{reportData.title}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{reportData.period}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <ReportRenderer data={reportData} />
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 rounded-b-xl">
            <p className="text-xs text-gray-400">Generated on {new Date().toLocaleString()} · TWS ERP — Confidential</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reporting;
