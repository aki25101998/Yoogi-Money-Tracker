import React, { useMemo } from 'react';
import { 
    CalendarCheck, 
    ChevronLeft, 
    ChevronRight, 
    Calendar, 
    SlidersHorizontal,
    Target 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const DailyDisciplineHeader = ({
    selectedMonth,
    onSelectMonth,
    dailyLimit = 150000,
    onOpenConfig
}) => {
    // Current month in local format 'YYYY-MM'
    const currentMonthStr = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }, []);

    const monthToUse = selectedMonth || currentMonthStr;

    const [yearNum, monthNum] = useMemo(() => {
        const parts = monthToUse.split('-');
        const y = parseInt(parts[0], 10) || new Date().getFullYear();
        const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
        return [y, m];
    }, [monthToUse]);

    const formattedMonthLabel = `Tháng ${String(monthNum).padStart(2, '0')}/${yearNum}`;
    const isCurrentMonth = monthToUse === currentMonthStr;

    const handlePrevMonth = () => {
        let prevYear = yearNum;
        let prevMonth = monthNum - 1;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
        }
        const newMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        onSelectMonth?.(newMonthStr);
    };

    const handleNextMonth = () => {
        let nextYear = yearNum;
        let nextMonth = monthNum + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const newMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        onSelectMonth?.(nextMonthStr);
    };

    const handleJumpToCurrent = () => {
        onSelectMonth?.(currentMonthStr);
    };

    const handleMonthInputChange = (e) => {
        if (e.target.value) {
            onSelectMonth?.(e.target.value);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            {/* Top row: Title + Limit Badge + Settings button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm flex-shrink-0">
                        <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            Lịch Kỷ Luật Chi Tiêu
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Kiểm soát ngân sách chi tiêu hàng ngày
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {/* Daily Limit Badge */}
                    <div 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                        title={`Hạn mức chi tiêu: ${formatCurrency(dailyLimit)}/ngày`}
                    >
                        <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mục tiêu: <strong className="font-bold">{formatCurrency(dailyLimit)}</strong>/ngày</span>
                    </div>

                    {/* Settings Button */}
                    <button
                        type="button"
                        onClick={onOpenConfig}
                        className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-600 shadow-sm"
                        title="Cấu hình kỷ luật"
                        aria-label="Cấu hình kỷ luật"
                    >
                        <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        <span className="hidden sm:inline">Cài đặt</span>
                    </button>
                </div>
            </div>

            {/* Bottom row: Month Navigator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                        title="Tháng trước"
                        aria-label="Tháng trước"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="relative inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-w-[130px]">
                        <span>{formattedMonthLabel}</span>
                        <input
                            type="month"
                            value={monthToUse}
                            onChange={handleMonthInputChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            aria-label="Chọn tháng"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                        title="Tháng sau"
                        aria-label="Tháng sau"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick jump to Today / Current Month */}
                {!isCurrentMonth && (
                    <button
                        type="button"
                        onClick={handleJumpToCurrent}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 transition-colors shadow-sm"
                        title="Quay về tháng hiện tại"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Hôm nay</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailyDisciplineHeader;
