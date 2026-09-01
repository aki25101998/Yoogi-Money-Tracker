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

export const calculateItemStats = (item, referenceDate = new Date(), transactions = null) => {
    const start = new Date(item.startDate);
    const now = new Date(referenceDate);

    // Helper to compare "YYYY-MM" strings
    const currentYearMonth = getYearMonth(now);

    // Logic based on Manual Payment (paidMonths)
    if (Array.isArray(item.paidMonths)) {
        // Filter payments made ON or BEFORE the reference month
        // logic: we count how many "paid marks" are <= currentYearMonth
        const validPaidMonths = item.paidMonths.filter(pm => pm <= currentYearMonth);

        const effectiveMonths = validPaidMonths.length;
        let paidAmount = effectiveMonths * item.monthlyPayment;
        
        // Add partial payments for months that are NOT fully paid
        let totalPartialPaid = 0;
        
        if (transactions && Array.isArray(transactions)) {
            const related = transactions.filter(t => t.type === 'installment_repaid' && (t.installmentId === item.id || (!t.installmentId && t.description?.startsWith(`Trả lẻ trả góp ${item.name}:`))));
            for (const t of related) {
                const txMonthStr = getInstallmentPaymentMonth(t);

                if (txMonthStr && txMonthStr <= currentYearMonth && !item.paidMonths.includes(txMonthStr)) {
                    totalPartialPaid += (t.amount || 0);
                }
            }
        } else if (item.partialPayments) {
            for (const [mStr, amount] of Object.entries(item.partialPayments)) {
                if (mStr <= currentYearMonth && !item.paidMonths.includes(mStr)) {
                    totalPartialPaid += parseFloat(amount) || 0;
                }
            }
        }
        
        paidAmount += totalPartialPaid;
        const remainingAmount = Math.max(0, item.totalPayable - paidAmount);

        // Progress based on effectively paid amount at that time vs total
        const progress = item.totalPayable > 0 ? Math.min((paidAmount / item.totalPayable) * 100, 100) : 0;

        // Finished if we have paid enough months (total term) AND strictly speaking, 
        // if we are viewing current time, it's finished. 
        // If viewing past, "isFinished" might be true if we had paid in advance?
        // Usually, isFinished = effectiveMonths >= term.
        const isFinished = remainingAmount <= 0 || effectiveMonths >= item.term;

        // Calculate months passed for schedule context
        let monthsPassed = monthDiff(start, now);
        if (now < start) monthsPassed = 0;

        return { monthsPassed, effectiveMonths, paidAmount, remainingAmount, progress, isFinished };
    }

    // Fallback: Legacy Time-based Logic (Only if paidMonths is missing)
    let monthsPassed = monthDiff(start, now);
    if (now < start) monthsPassed = 0;

    const effectiveMonths = Math.min(monthsPassed, item.term);
    const paidAmount = effectiveMonths * item.monthlyPayment;
    const remainingAmount = Math.max(0, item.totalPayable - paidAmount);
    const progress = item.totalPayable > 0 ? (paidAmount / item.totalPayable) * 100 : 0;
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
        if (!t.installmentId) return;
        if (!byInstallmentMap[t.installmentId]) {
            byInstallmentMap[t.installmentId] = { installmentId: t.installmentId, amount: 0 };
        }
        byInstallmentMap[t.installmentId].amount += (t.amount || 0);
    });
    
    return {
        total,
        count,
        byInstallment: Object.values(byInstallmentMap)
    };
};

export const calculateWrapperMonthlyRemaining = (wrapper, transactions) => {
    const { item, monthStr: currentMonthStr } = wrapper;
    const relatedTransactions = transactions?.filter(t => {
        if (t.type !== 'installment_repaid') return false;
        
        const txMonthStr = getInstallmentPaymentMonth(t);

        return (
            (t.installmentId === item.id && txMonthStr === currentMonthStr) ||
            ((t.description?.startsWith(`Trả lẻ trả góp ${item.name}:`) || t.description?.startsWith(`Trả tối thiểu ${item.name}`)) && !t.installmentId && txMonthStr === currentMonthStr)
        );
    }) || [];

    const partialPaid = relatedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
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
                    const wrapper = { item, monthStr: mStr };
                    totalDue += calculateWrapperMonthlyRemaining(wrapper, transactions);
                }
            }
        }
    });
    
    return totalDue;
};
