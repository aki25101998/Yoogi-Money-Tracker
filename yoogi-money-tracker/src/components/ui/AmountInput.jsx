import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const AmountInput = ({ value, onChange, placeholder, className, required, id, name }) => {
    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\./g, '');
        if (!isNaN(rawValue)) {
            onChange(rawValue);
        }
    };

    const displayValue = value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';

    return (
        <div>
            <input
                id={id}
                name={name}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                required={required}
                value={displayValue}
                onChange={handleAmountChange}
                className={className || "w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"}
            />
            {value && !isNaN(value) && parseFloat(value) > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 hide-scrollbar">
                    {[10, 100, 1000, 10000, 100000, 1000000]
                        .map(multiplier => parseFloat(value) * multiplier)
                        .filter(val => val >= 1000 && val <= 9999999999)
                        .slice(0, 3)
                        .map(suggestedValue => (
                            <button
                                key={suggestedValue}
                                type="button"
                                onClick={() => onChange(suggestedValue)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-colors"
                            >
                                {formatCurrency(suggestedValue)}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};

export default AmountInput;
