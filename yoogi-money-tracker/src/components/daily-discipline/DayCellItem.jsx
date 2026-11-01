import React from 'react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Format amount compactly (e.g. 120k, 1.2M, 0k).
 */
export const formatCompactAmount = (amount) => {
    const num = Number(amount) || 0;
    if (num === 0) return '0k';
    const abs = Math.abs(num);
    if (abs >= 1_000_000) {
        const m = num / 1_000_000;
        const formatted = m % 1 === 0 ? m : parseFloat(m.toFixed(2));
        return `${formatted}M`;
    }
    if (abs >= 1_000) {
        const k = num / 1_000;
        const formatted = k % 1 === 0 ? k : parseFloat(k.toFixed(1));
        return `${formatted}k`;
    }
    return `${num}`;
};

const DayCellItem = ({
    dayData,
    isToday = false,
    onSelectDay,
    className = '',
    ...props
}) => {
    const {
        day = 1,
        dateStr = '',
        spent = 0,
        overAmount = 0,
        status = 'future',
        trackedTransactions = [],
        otherTransactions = []
    } = dayData || {};

    const handleClick = () => {
        onSelectDay?.(dayData);
    };

    // Style map based on day status
    const statusBoxStyles = {
        pass: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40',
        fail: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/40',
        no_spend: 'border-teal-200 dark:border-teal-800/60 bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100/70 dark:hover:bg-teal-900/50',
        future: 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/40',
        unconfigured: 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-slate-400 hover:bg-slate-100/40 dark:hover:bg-slate-800/30'
    };

    const currentBoxStyle = statusBoxStyles[status] || statusBoxStyles.future;

    // Spent text styling
    const spentTextStyles = {
        pass: 'text-emerald-700 dark:text-emerald-300 font-bold',
        fail: 'text-rose-700 dark:text-rose-300 font-bold',
        no_spend: 'text-teal-700 dark:text-teal-300 font-bold',
        future: 'text-slate-400 dark:text-slate-600 font-medium',
        unconfigured: 'text-slate-400 dark:text-slate-500 font-medium'
    };

    const currentSpentStyle = spentTextStyles[status] || spentTextStyles.future;

    // Render spent label
    const renderSpent = () => {
        if (status === 'future' || status === 'unconfigured') {
            return '--';
        }
        if (status === 'no_spend') {
            return '0k';
        }
        return formatCompactAmount(spent);
    };

    // Render badge
    const renderBadge = () => {
        if (status === 'pass') {
            return (
                <span className="pointer-events-none inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 truncate max-w-full">
                    ✓ Đạt
                </span>
            );
        }
        if (status === 'fail') {
            return (
                <span 
                    className="pointer-events-none inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-rose-100/90 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 truncate max-w-full" 
                    title={`Vượt ${formatCurrency(overAmount)}`}
                >
                    {`✕ Vượt ${formatCompactAmount(overAmount)}`}
                </span>
            );
        }
        if (status === 'no_spend') {
            return (
                <span className="pointer-events-none inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-teal-100/90 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 truncate max-w-full">
                    ⭐ Không tiêu
                </span>
            );
        }
        return (
            <span className="pointer-events-none text-[9px] sm:text-[10px] opacity-0 select-none">
                --
            </span>
        );
    };

    const tooltipTitle = dateStr 
        ? `${dateStr} - Chi tiêu: ${formatCurrency(spent)}${overAmount > 0 ? ` (Vượt ${formatCurrency(overAmount)})` : ''}`
        : `Ngày ${day}`;

    return (
        <button
            type="button"
            onClick={handleClick}
            title={tooltipTitle}
            className={`group relative w-full min-h-[68px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between text-left transition-all active:scale-95 cursor-pointer border ${currentBoxStyle} ${
                isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 sm:ring-offset-2 dark:ring-offset-slate-900 shadow-xs' : ''
            } ${className}`}
            {...props}
        >
            {/* Top row: Day Number + Today indicator */}
            <div className="pointer-events-none flex items-center justify-between w-full">
                <span
                    className={`pointer-events-none ${
                        isToday
                            ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-xs'
                            : 'font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300'
                    }`}
                >
                    {day}
                </span>

                {isToday && (
                    <span className="pointer-events-none hidden sm:inline-block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Hôm nay
                    </span>
                )}
                {isToday && (
                    <span className="pointer-events-none sm:hidden w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
            </div>

            {/* Middle row: Spent amount */}
            <div className="pointer-events-none my-0.5">
                <span className={`pointer-events-none block text-xs sm:text-sm tabular-nums tracking-tight ${currentSpentStyle}`}>
                    {renderSpent()}
                </span>
            </div>

            {/* Bottom row: Status badge */}
            <div className="pointer-events-none flex items-center min-h-[18px]">
                {renderBadge()}
            </div>
        </button>
    );
};

export default DayCellItem;
