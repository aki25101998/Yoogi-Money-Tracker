import React, { useMemo } from 'react';
import DayCellItem from './DayCellItem';
import { getLocalDateStr } from '../../hooks/useDailyDiscipline';

const WEEK_DAYS = [
    { key: 't2', label: 'T2', name: 'Thứ Hai', isWeekend: false, color: 'text-slate-600 dark:text-slate-400' },
    { key: 't3', label: 'T3', name: 'Thứ Ba', isWeekend: false, color: 'text-slate-600 dark:text-slate-400' },
    { key: 't4', label: 'T4', name: 'Thứ Tư', isWeekend: false, color: 'text-slate-600 dark:text-slate-400' },
    { key: 't5', label: 'T5', name: 'Thứ Năm', isWeekend: false, color: 'text-slate-600 dark:text-slate-400' },
    { key: 't6', label: 'T6', name: 'Thứ Sáu', isWeekend: false, color: 'text-slate-600 dark:text-slate-400' },
    { key: 't7', label: 'T7', name: 'Thứ Bảy', isWeekend: true, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'cn', label: 'CN', name: 'Chủ Nhật', isWeekend: true, color: 'text-rose-600 dark:text-rose-400' }
];

const DisciplineCalendarGrid = ({
    selectedMonth,
    calendarDays = [],
    onSelectDay,
    currentDateStr,
    className = '',
    ...props
}) => {
    // Current local date string 'YYYY-MM-DD'
    const todayStr = useMemo(() => {
        return currentDateStr || getLocalDateStr(new Date());
    }, [currentDateStr]);

    // Resolved month string 'YYYY-MM'
    const monthToUse = useMemo(() => {
        return selectedMonth || todayStr.slice(0, 7);
    }, [selectedMonth, todayStr]);

    // Parse year and 1-based month
    const [yearNum, monthNum] = useMemo(() => {
        const parts = monthToUse.split('-');
        const y = parseInt(parts[0], 10) || new Date().getFullYear();
        const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
        return [y, m];
    }, [monthToUse]);

    // Offset calculation:
    // In Vietnam / ISO 8601, weeks start on Monday (T2):
    // Monday = 0, Tuesday = 1, ..., Sunday = 6.
    // If new Date(year, monthIndex, 1).getDay() returns 0 (Sunday), offset is 6; else day - 1.
    const startOffset = useMemo(() => {
        // monthNum is 1-based, new Date(y, m - 1, 1) gets first day of month
        const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay();
        return firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    }, [yearNum, monthNum]);

    return (
        <div 
            className={`bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
            {...props}
        >
            {/* Week day column headers */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mb-2.5">
                {WEEK_DAYS.map((wd) => (
                    <div
                        key={wd.key}
                        className={`text-center py-1.5 sm:py-2 text-xs sm:text-sm font-bold tracking-wide rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 ${wd.color}`}
                    >
                        <span>{wd.label}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                {/* Empty placeholder cells for the offset before day 1 */}
                {Array.from({ length: startOffset }).map((_, idx) => (
                    <div
                        key={`offset-${idx}`}
                        data-testid={`offset-${idx}`}
                        aria-hidden="true"
                        className="min-h-[68px] sm:min-h-[84px] rounded-xl border border-dashed border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10 pointer-events-none"
                    />
                ))}

                {/* Day Cell Items */}
                {calendarDays.map((dayData) => {
                    const isToday = dayData.dateStr === todayStr;
                    return (
                        <DayCellItem
                            key={dayData.dateStr || dayData.day}
                            dayData={dayData}
                            isToday={isToday}
                            onSelectDay={onSelectDay}
                        />
                    );
                })}
            </div>

            {/* Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 gap-2">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Đạt mục tiêu</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Vượt hạn mức</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        <span>Không tiêu</span>
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
                    <span>Hôm nay</span>
                </div>
            </div>
        </div>
    );
};

export default DisciplineCalendarGrid;
