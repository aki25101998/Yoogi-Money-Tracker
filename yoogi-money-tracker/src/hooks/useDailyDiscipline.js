import { useMemo } from 'react';

/**
 * Extracts local date string 'YYYY-MM-DD' from any date representation,
 * preventing UTC offset shifts.
 */
export const getLocalDateStr = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput).slice(0, 10);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

export const calculateDailyDiscipline = ({
    transactions = [],
    categories = [],
    config = { enabled: true, daily_limit: 150000, category_ids: [], wallet_ids: [] },
    selectedMonth, // 'YYYY-MM'
    currentDateStr = getLocalDateStr(new Date()) // 'YYYY-MM-DD'
} = {}) => {
    const safeConfig = config || { enabled: true, daily_limit: 150000, category_ids: [], wallet_ids: [] };
    const monthToUse = selectedMonth || currentDateStr.slice(0, 7);
    const isEnabled = safeConfig.enabled !== false;
    const isSetupRequired = !isEnabled || !safeConfig.category_ids || safeConfig.category_ids.length === 0;

    const [year, month] = monthToUse.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const currentMonthStr = currentDateStr.slice(0, 7);
    const isPastMonth = monthToUse < currentMonthStr;
    const isCurrentMonth = monthToUse === currentMonthStr;
    const isFutureMonth = monthToUse > currentMonthStr;

    const currentDayNum = Number(currentDateStr.slice(8, 10));
    const elapsedDays = isPastMonth
        ? totalDaysInMonth
        : isCurrentMonth
        ? Math.min(currentDayNum, totalDaysInMonth)
        : 0;

    const remainingDays = Math.max(0, totalDaysInMonth - elapsedDays);

    // Group transactions by date using local date normalization
    const trackedTxByDate = {};
    const otherTxByDate = {};

    transactions.forEach(t => {
        if (!t.date) return;
        const localDate = getLocalDateStr(t.date);
        if (!localDate.startsWith(monthToUse)) return;
        if (t.type !== 'expense') return;

        // Wallet filter if configured
        if (safeConfig.wallet_ids && safeConfig.wallet_ids.length > 0) {
            if (!safeConfig.wallet_ids.includes(t.walletId)) return;
        }

        const isTrackedCategory = !isSetupRequired && (
            (t.categoryId && safeConfig.category_ids.includes(t.categoryId)) ||
            (t.subcategoryId && safeConfig.category_ids.includes(t.subcategoryId))
        );

        if (isTrackedCategory) {
            if (!trackedTxByDate[localDate]) trackedTxByDate[localDate] = [];
            trackedTxByDate[localDate].push(t);
        } else {
            if (!otherTxByDate[localDate]) otherTxByDate[localDate] = [];
            otherTxByDate[localDate].push(t);
        }
    });

    const calendarDays = [];
    let passCount = 0;
    let failCount = 0;
    let mtdActualSpent = 0;
    const dailyLimit = Number(safeConfig.daily_limit) || 150000;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${monthToUse}-${dayStr}`;
        const dayTrackedTx = trackedTxByDate[dateStr] || [];
        const dayOtherTx = otherTxByDate[dateStr] || [];
        const spent = dayTrackedTx.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        let status = 'future';
        let overAmount = 0;

        if (isPastMonth || (isCurrentMonth && day <= currentDayNum)) {
            mtdActualSpent += spent;
            if (isSetupRequired) {
                status = 'unconfigured';
            } else if (spent === 0) {
                status = 'no_spend';
                passCount++;
            } else if (spent <= dailyLimit) {
                status = 'pass';
                passCount++;
            } else {
                status = 'fail';
                overAmount = spent - dailyLimit;
                failCount++;
            }
        }

        calendarDays.push({
            day,
            dateStr,
            spent,
            overAmount,
            status,
            trackedTransactions: dayTrackedTx,
            otherTransactions: dayOtherTx
        });
    }

    const successRate = elapsedDays > 0 ? Math.round((passCount / elapsedDays) * 100) : 0;
    const mtdExpected = elapsedDays * dailyLimit;
    const diff = mtdExpected - mtdActualSpent; // >= 0: saving, < 0: over budget

    const totalMonthBudget = totalDaysInMonth * dailyLimit;
    const remainingBudget = Math.max(0, totalMonthBudget - mtdActualSpent);
    const dailySuggested = remainingDays > 0 ? Math.round(remainingBudget / remainingDays) : 0;

    return {
        isEnabled,
        isSetupRequired,
        calendarDays,
        summary: {
            isPastMonth,
            isCurrentMonth,
            isFutureMonth,
            totalDaysInMonth,
            elapsedDays,
            remainingDays,
            passCount,
            failCount,
            successRate,
            mtdExpected,
            mtdActualSpent,
            diff,
            totalMonthBudget,
            remainingBudget,
            dailySuggested
        }
    };
};

export const useDailyDiscipline = ({
    transactions = [],
    categories = [],
    config,
    selectedMonth,
    currentDateStr
} = {}) => {
    return useMemo(() => {
        return calculateDailyDiscipline({
            transactions,
            categories,
            config,
            selectedMonth,
            currentDateStr
        });
    }, [transactions, categories, config, selectedMonth, currentDateStr]);
};

export default useDailyDiscipline;
