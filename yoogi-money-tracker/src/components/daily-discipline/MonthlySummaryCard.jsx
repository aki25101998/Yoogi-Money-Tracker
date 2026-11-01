import React from 'react';
import { 
    AlertCircle, 
    Sparkles, 
    CheckCircle2, 
    AlertTriangle, 
    Award, 
    TrendingDown, 
    TrendingUp, 
    Wallet 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const MonthlySummaryCard = ({
    summary = {},
    isSetupRequired = false,
    onOpenConfig
}) => {
    const {
        isPastMonth = false,
        isCurrentMonth = false,
        isFutureMonth = false,
        totalDaysInMonth = 30,
        elapsedDays = 0,
        remainingDays = 0,
        passCount = 0,
        failCount = 0,
        successRate = 0,
        mtdExpected = 0,
        mtdActualSpent = 0,
        diff = 0,
        totalMonthBudget = 0,
        remainingBudget = 0,
        dailySuggested = 0
    } = summary || {};

    const progressPercent = mtdExpected > 0 
        ? Math.round((mtdActualSpent / mtdExpected) * 100) 
        : 0;
    const clampedProgress = Math.min(100, Math.max(0, progressPercent));
    const isOverBudget = diff < 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 sm:space-y-5">
            {/* 1. Setup Prompt Banner (if setup required) */}
            {isSetupRequired && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-800 dark:text-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                Chưa thiết lập danh mục kỷ luật
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                Bạn chưa chọn danh mục chi tiêu áp dụng cho Kỷ luật ngày (ví dụ: Ăn uống, Cà phê...)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenConfig}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg transition-colors shadow-sm self-start sm:self-auto flex-shrink-0"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Thiết lập ngay</span>
                    </button>
                </div>
            )}

            {/* 2. KPI Grid (3 cards) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Hoàn thành */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-3 sm:p-4 text-center sm:text-left flex flex-col justify-between">
                    <div className="flex items-center justify-center sm:justify-between mb-1">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Hoàn thành</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 hidden sm:block" />
                    </div>
                    <div className="text-base sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {passCount} <span className="text-xs sm:text-sm font-normal">ngày</span>
                    </div>
                </div>

                {/* Thất bại */}
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/50 rounded-xl p-3 sm:p-4 text-center sm:text-left flex flex-col justify-between">
                    <div className="flex items-center justify-center sm:justify-between mb-1">
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Thất bại</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500 hidden sm:block" />
                    </div>
                    <div className="text-base sm:text-2xl font-bold text-rose-700 dark:text-rose-300">
                        {failCount} <span className="text-xs sm:text-sm font-normal">ngày</span>
                    </div>
                </div>

                {/* Tỷ lệ kỷ luật */}
                <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/50 rounded-xl p-3 sm:p-4 text-center sm:text-left flex flex-col justify-between">
                    <div className="flex items-center justify-center sm:justify-between mb-1">
                        <span className="text-xs font-medium text-sky-600 dark:text-sky-400">Tỷ lệ kỷ luật</span>
                        <Award className="w-4 h-4 text-sky-500 hidden sm:block" />
                    </div>
                    <div className="text-base sm:text-2xl font-bold text-sky-700 dark:text-sky-300">
                        {isFutureMonth ? 'Chưa bắt đầu' : `${successRate}%`}
                    </div>
                </div>
            </div>

            {/* 3. Month-to-Date Progress & Comparison */}
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                    <div className="text-slate-600 dark:text-slate-300">
                        <span>Đã chi: </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(mtdActualSpent)}</strong>
                        <span className="text-slate-400 dark:text-slate-500"> / Kỳ vọng đến nay: </span>
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(mtdExpected)}</strong>
                    </div>
                    {mtdExpected > 0 && (
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {progressPercent}% mức kỳ vọng
                        </div>
                    )}
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400'
                        }`}
                        style={{ width: `${clampedProgress}%` }}
                    />
                </div>

                {/* Comparison Indicator */}
                <div className="flex items-center pt-1">
                    {isFutureMonth ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                            Tháng chưa bắt đầu
                        </div>
                    ) : diff >= 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Đang tiết kiệm hơn kỳ vọng: +{formatCurrency(diff)}</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                            <TrendingUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Đang vượt quá kỳ vọng: -{formatCurrency(Math.abs(diff))}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Remaining Month Allowance Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm">
                {remainingDays > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                            <span>
                                Ngân sách còn lại: <strong className="font-bold text-slate-900 dark:text-white">{formatCurrency(remainingBudget)}</strong>
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Còn lại <strong className="font-semibold text-slate-700 dark:text-slate-300">{`${remainingDays} ngày`}</strong>, trung bình <strong className="font-semibold text-slate-700 dark:text-slate-300">{`${formatCurrency(dailySuggested)}/ngày`}</strong>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        <span>Tháng này đã kết thúc. Tổng chi tiêu kỷ luật: <strong className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(mtdActualSpent)}</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlySummaryCard;
