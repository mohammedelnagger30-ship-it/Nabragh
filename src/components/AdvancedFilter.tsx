import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  type?: 'checkbox' | 'radio';
}

interface AdvancedFilterProps {
  groups: FilterGroup[];
  onFilterChange: (filters: Record<string, string[]>) => void;
  activeFilters: Record<string, string[]>;
}

export default function AdvancedFilter({ groups, onFilterChange, activeFilters }: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleFilterChange = (groupId: string, optionId: string, type: 'checkbox' | 'radio') => {
    const newFilters = { ...activeFilters };
    
    if (type === 'radio') {
      newFilters[groupId] = [optionId];
    } else {
      const currentFilters = newFilters[groupId] || [];
      if (currentFilters.includes(optionId)) {
        newFilters[groupId] = currentFilters.filter(id => id !== optionId);
      } else {
        newFilters[groupId] = [...currentFilters, optionId];
      }
    }
    
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(activeFilters).some(key => activeFilters[key].length > 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="font-semibold text-slate-900 dark:text-white">تصفية متقدمة</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {Object.values(activeFilters).flat().length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
          {groups.map(group => (
            <div key={group.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-4 last:pb-0">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between mb-3"
              >
                <span className="font-medium text-slate-900 dark:text-white">{group.label}</span>
                {expandedGroups.has(group.id) ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedGroups.has(group.id) && (
                <div className="space-y-2">
                  {group.options.map(option => (
                    <label
                      key={option.id}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <input
                        type={group.type || 'checkbox'}
                        name={group.id}
                        value={option.id}
                        checked={(activeFilters[group.id] || []).includes(option.id)}
                        onChange={() => handleFilterChange(group.id, option.id, group.type || 'checkbox')}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:ring-offset-0 dark:bg-slate-700"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">({option.count})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      )}
    </div>
  );
}
