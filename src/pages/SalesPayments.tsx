import React, { useState } from 'react';
import { Receipt, Plus, FileText, CreditCard, Repeat, Info } from 'lucide-react';
import clsx from 'clsx';

type SalesTab = 'estimates' | 'invoices' | 'payment-setup' | 'recurring';

const TABS: Array<{ id: SalesTab; label: string; icon: React.ReactNode }> = [
  { id: 'estimates', label: 'Estimates', icon: <FileText size={16} /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={16} /> },
  { id: 'payment-setup', label: 'Payment Setup', icon: <CreditCard size={16} /> },
  { id: 'recurring', label: 'Recurring Invoices', icon: <Repeat size={16} /> },
];

export const SalesPayments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SalesTab>('estimates');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Receipt className="text-purple-600 dark:text-purple-400" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sales & Payments</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Manage estimates, invoices, and recurring billing
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Coming soon"
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
            'bg-gray-100 text-gray-400 cursor-not-allowed',
            'dark:bg-slate-800 dark:text-slate-500'
          )}
        >
          Monthly Management Accounts & Financials
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-700">Coming soon</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'estimates' && <EstimatesTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'payment-setup' && <PaymentSetupTab />}
          {activeTab === 'recurring' && <RecurringTab />}
        </div>
      </div>
    </div>
  );
};

const EstimatesTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Estimates</h2>
        <button
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700 shadow-sm transition-all'
          )}
        >
          <Plus size={16} />
          New Estimate
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Number</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Project</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  No estimates yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InvoicesTab: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'awaiting' | 'paid' | 'overdue'>('all');
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'awaiting', label: 'Awaiting Payment' },
    { id: 'paid', label: 'Paid' },
    { id: 'overdue', label: 'Overdue' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Invoices</h2>
        <button
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700 shadow-sm transition-all'
          )}
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeFilter === f.id
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Number</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Project</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Due Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  No invoices yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PaymentSetupTab: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Info className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500 mb-3" />
        <p className="text-sm text-gray-500 dark:text-slate-400">No functionality for now.</p>
      </div>
    </div>
  );
};

const RecurringTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recurring Invoices</h2>
        <button
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700 shadow-sm transition-all'
          )}
        >
          <Plus size={16} />
          New Schedule
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Description</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Frequency</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Next Invoice Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Mode</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  No recurring schedules yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesPayments;
