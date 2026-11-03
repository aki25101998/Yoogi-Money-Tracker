import { getInstallmentPaymentMonth } from './transactionUtils';

export const monthDiff = (d1, d2) => {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
};

export const calculateLoan = (amount, rate, term) => {
    const pAmount = parseFloat(amount);
    const pRate = parseFloat(rate);
    const pTerm = parseInt(term);

    if (!pAmount || !pTerm) return 0;
    if (pRate === 0) return pAmount / pTerm;

    const monthlyRate = pRate / 100 / 12;
    const monthlyPayment = (pAmount * monthlyRate * Math.pow(1 + monthlyRate, pTerm)) / (Math.pow(1 + monthlyRate, pTerm) - 1);
    return monthlyPayment;
};

export const getYearMonth = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const isTransactionForInstallment = (t, item) => {
    if (t.type !== 'installment_repaid') return false;
    
    if (t.installmentId) return t.installmentId === item.id;
    
    if (!t.installmentId && t.description) {
        return t.description.startsWith(`Trả lẻ trả góp ${item.name}:`) || 
               t.description.startsWith(`Trả tối thiểu ${item.name}`);
    }
    
    return false;
};

export const getPartialPaymentForMonth = (item, monthStr, transactions) => {
    let partialPaid = 0;
    
    if (transactions && Array.isArray(transactions)) {
        const relatedTransactions = transactions.filter(t => 
            isTransactionForInstallment(t, item) && 
            getInstallmentPaymentMonth(t) === monthStr
        );
        partialPaid = relatedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    } else if (item.partialPayments && item.partialPayments[monthStr]) {
        partialPaid = parseFloat(item.partialPayments[monthStr]) || 0;
    }
    
    return partialPaid;
};

export const calculateItemStats = (item, referenceDate = new Date(), transactions = null) => {
    const start = new Date(item.startDate);
    const now = new Date(referenceDate);

    let monthsPassed = monthDiff(start, now);
    if (now < start) monthsPassed = 0;

    let effectiveMonths = 0;
    let paidAmount = 0;

    if (Array.isArray(item.paidMonths)) {
        effectiveMonths = item.paidMonths.length;
        paidAmount = effectiveMonths * item.monthlyPayment;
        
        let totalPartialPaid = 0;
        
        if (transactions && Array.isArray(transactions)) {
            const related = transactions.filter(t => isTransactionForInstallment(t, item));
            for (const t of related) {
                const txMonthStr = getInstallmentPaymentMonth(t);
                if (txMonthStr && !item.paidMonths.includes(txMonthStr)) {
                    totalPartialPaid += (t.amount || 0);
                }
            }
        } else if (item.partialPayments) {
            for (const [mStr, amount] of Object.entries(item.partialPayments)) {
                if (!item.paidMonths.includes(mStr)) {
                    totalPartialPaid += parseFloat(amount) || 0;
                }
            }
        }
        
        paidAmount += totalPartialPaid;
    } else {
        effectiveMonths = Math.min(monthsPassed, item.term);
        paidAmount = effectiveMonths * item.monthlyPayment;
    }

    paidAmount = Math.min(paidAmount, item.totalPayable);

    const remainingAmount = Math.max(0, item.totalPayable - paidAmount);

    const progress = item.totalPayable > 0 ? Math.min((paidAmount / item.totalPayable) * 100, 100) : 0;

    const isFinished = remainingAmount <= 0 || effectiveMonths >= item.term;

    return { monthsPassed, effectiveMonths, paidAmount, remainingAmount, progress, isFinished };
};

export const getInstallmentSummaryForMonth = (transactions, year, month) => {
    if (!transactions) return { total: 0, count: 0, byInstallment: [] };
    
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    const installmentTxns = transactions.filter(t => {
        if (t.type !== 'installment_repaid') return false;
        const txMonthStr = getInstallmentPaymentMonth(t);
        return txMonthStr === targetMonthStr;
    });

    const total = installmentTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const count = installmentTxns.length;
    
    const byInstallmentMap = {};
    installmentTxns.forEach(t => {
        let itemId = t.installmentId;
        
        if (!itemId) {
            const match = t.description?.match(/trả góp (.*?):/i) || t.description?.match(/tối thiểu (.*)/i);
            if (match) {
                itemId = match[1].trim();
            }
        }

        if (!itemId) return;

        if (!byInstallmentMap[itemId]) {
            byInstallmentMap[itemId] = { installmentId: itemId, amount: 0 };
        }
        byInstallmentMap[itemId].amount += (t.amount || 0);
    });
    
    return {
        total,
        count,
        byInstallment: Object.values(byInstallmentMap)
    };
};

export const calculateWrapperMonthlyRemaining = (wrapper, transactions) => {
    const { item, monthStr: currentMonthStr } = wrapper;
    const partialPaid = getPartialPaymentForMonth(item, currentMonthStr, transactions);
    return Math.max(item.monthlyPayment - partialPaid, 0);
};

export const calculateMonthlyDueForItems = (items, targetDate, transactions) => {
    let totalDue = 0;
    const targetMonthStr = getYearMonth(targetDate);
    
    items.forEach(item => {
        const start = new Date(item.startDate);
        const paidMonths = item.paidMonths || [];
        
        for (let i = 0; i < item.term; i++) {
            const checkDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const mStr = getYearMonth(checkDate);
            
            if (mStr <= targetMonthStr) {
                const isPaid = paidMonths.includes(mStr);
                if (!isPaid) {
                    const partialPaid = getPartialPaymentForMonth(item, mStr, transactions);
                    totalDue += Math.max(item.monthlyPayment - partialPaid, 0);
                }
            }
        }
    });
    
    return totalDue;
};

export const getItemDueDay = (item, customDueDay = null) => {
    if (customDueDay && !isNaN(customDueDay)) {
        const parsedCustom = parseInt(customDueDay, 10);
        if (parsedCustom >= 1 && parsedCustom <= 31) return parsedCustom;
    }
    if (item?.dueDay && !isNaN(item.dueDay)) {
        const parsedDueDay = parseInt(item.dueDay, 10);
        if (parsedDueDay >= 1 && parsedDueDay <= 31) return parsedDueDay;
    }
    if (item?.startDate) {
        const parts = String(item.startDate).split('-');
        if (parts.length >= 3) {
            const day = parseInt(parts[2], 10);
            if (!isNaN(day) && day >= 1 && day <= 31) return day;
        }
    }
    return 1;
};

export const getInstallmentDueDate = (item, targetDate = new Date(), customDueDay = null) => {
    const d = new Date(targetDate);
    const targetYear = d.getFullYear();
    const targetMonth = d.getMonth();
    const dueDay = getItemDueDay(item, customDueDay);
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(dueDay, maxDays);
    return new Date(targetYear, targetMonth, safeDay);
};

export const getDueStatus = (dueDate, isPaid = false, compareDate = new Date()) => {
    const today = new Date(compareDate);
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (isPaid) {
        return {
            status: 'paid',
            text: 'Đã thanh toán kỳ này',
            badgeText: '✓ Đã thanh toán',
            diffDays,
            badgeClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
            iconColorClass: 'text-emerald-500 dark:text-emerald-400',
            iconBgClass: 'bg-emerald-50 dark:bg-emerald-900/30'
        };
    }

    if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays);
        return {
            status: 'overdue',
            text: `Quá hạn ${overdueDays} ngày`,
            badgeText: `⚠ Quá hạn ${overdueDays} ngày`,
            diffDays,
            badgeClass: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
            iconColorClass: 'text-rose-500 dark:text-rose-400',
            iconBgClass: 'bg-rose-50 dark:bg-rose-900/30'
        };
    }

    if (diffDays === 0) {
        return {
            status: 'today',
            text: 'Hôm nay đến hạn',
            badgeText: '⏰ Hôm nay đến hạn!',
            diffDays: 0,
            badgeClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse',
            iconColorClass: 'text-amber-500 dark:text-amber-400',
            iconBgClass: 'bg-amber-50 dark:bg-amber-900/30'
        };
    }

    return {
        status: 'upcoming',
        text: `Còn ${diffDays} ngày`,
        badgeText: `Còn ${diffDays} ngày`,
        diffDays,
        badgeClass: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
        iconColorClass: 'text-indigo-500 dark:text-indigo-400',
        iconBgClass: 'bg-indigo-50 dark:bg-indigo-900/30'
    };
};

export const getLenderDueInfo = (group, targetDate = new Date(), customDueDay = null, compareDate = new Date()) => {
    const d = new Date(targetDate);
    const targetYear = d.getFullYear();
    const targetMonth = d.getMonth();
    const targetMonthStr = getYearMonth(d);
    const items = group.items || [];
    const monthlyDue = group.monthlyDue ?? 0;
    const isLenderFullyPaid = group.status === 'paid';
    const isPeriodPaid = monthlyDue <= 0 && items.length > 0;

    // 1. Trường hợp lender có ngày cố định tùy chỉnh
    if (customDueDay && !isNaN(customDueDay)) {
        const fixedDay = parseInt(customDueDay, 10);
        if (fixedDay >= 1 && fixedDay <= 31) {
            const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
            const safeDay = Math.min(fixedDay, maxDays);
            const dueDate = new Date(targetYear, targetMonth, safeDay);
            const dateStr = `${String(safeDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`;
            const status = getDueStatus(dueDate, isPeriodPaid || isLenderFullyPaid, compareDate);

            return {
                dueDay: fixedDay,
                dueDate,
                dateStr,
                title: `${dateStr} (Ngày ${fixedDay} hàng tháng)`,
                displayText: `${dateStr} (Ngày ${fixedDay} hàng tháng)`,
                shortText: `Hạn: ${dateStr}`,
                ...status,
                isCustom: true
            };
        }
    }

    // 2. Không có item
    if (items.length === 0) {
        return {
            dueDay: null,
            dueDate: null,
            dateStr: '',
            title: 'Chưa có khoản vay',
            displayText: 'Chưa có khoản vay',
            badgeText: 'Chưa có dữ liệu',
            badgeClass: 'bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600',
            iconColorClass: 'text-slate-400',
            iconBgClass: 'bg-slate-100 dark:bg-slate-700',
            status: 'none',
            isCustom: false
        };
    }

    // 3. Tự động tính từ các món trả góp
    const unpaidItems = items.filter(item => {
        const paidMonths = item.paidMonths || [];
        return !paidMonths.includes(targetMonthStr);
    });

    const relevantItems = unpaidItems.length > 0 ? unpaidItems : items;
    const dueDays = [...new Set(relevantItems.map(item => getItemDueDay(item)))].sort((a, b) => a - b);

    if (dueDays.length === 1) {
        const day = dueDays[0];
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        const safeDay = Math.min(day, maxDays);
        const dueDate = new Date(targetYear, targetMonth, safeDay);
        const dateStr = `${String(safeDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`;
        const status = getDueStatus(dueDate, isPeriodPaid || isLenderFullyPaid, compareDate);

        return {
            dueDay: day,
            dueDate,
            dateStr,
            title: `${dateStr} (Ngày ${day} hàng tháng)`,
            displayText: `${dateStr} (Ngày ${day} hàng tháng)`,
            shortText: `Hạn: ${dateStr}`,
            ...status,
            allDays: dueDays,
            isCustom: false
        };
    }

    // Nhiều ngày đến hạn khác nhau
    const today = new Date(compareDate);
    today.setHours(0, 0, 0, 0);

    const mappedDueDates = dueDays.map(day => {
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        const safeDay = Math.min(day, maxDays);
        const dueDate = new Date(targetYear, targetMonth, safeDay);
        return { day: safeDay, dueDate, diff: dueDate.getTime() - today.getTime() };
    });

    mappedDueDates.sort((a, b) => {
        if (a.diff >= 0 && b.diff >= 0) return a.diff - b.diff;
        if (a.diff < 0 && b.diff < 0) return b.diff - a.diff;
        return a.diff < 0 ? -1 : 1;
    });

    const nearest = mappedDueDates[0];
    const nearestDateStr = `${String(nearest.day).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`;
    const status = getDueStatus(nearest.dueDate, isPeriodPaid || isLenderFullyPaid, compareDate);

    return {
        dueDay: nearest.day,
        dueDate: nearest.dueDate,
        dateStr: nearestDateStr,
        title: `Gần nhất: ${nearestDateStr} (Ngày ${dueDays.join(', ')})`,
        displayText: `Gần nhất: ${nearestDateStr} (Ngày ${dueDays.join(', ')})`,
        shortText: `Hạn: ${nearestDateStr}`,
        ...status,
        allDays: dueDays,
        isCustom: false
    };
};
