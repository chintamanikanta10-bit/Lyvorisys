import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

const AdvancedFilterPanel = ({
  title = 'Advanced filters',
  description = 'Refine records with multiple HR criteria.',
  fields = [],
  filters = {},
  onFilterChange,
  onApply,
  onReset,
  departmentOptions = []
}) => {
  const updateFilter = (key, value) => {
    if (onFilterChange) {
      onFilterChange((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="glass-card border border-slate-200 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <Filter className="h-4 w-4" />
            {title}
          </div>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApply}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const value = filters[field.key] ?? '';

          return (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={value}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{field.placeholder || 'Select option'}</option>
                  {(field.options || departmentOptions).map((option) => (
                    <option key={option.value ?? option} value={option.value ?? option}>
                      {option.label ?? option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'date' ? (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={value}
                  min={field.min}
                  max={field.max}
                  step={field.step || '1'}
                  placeholder={field.placeholder}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;
