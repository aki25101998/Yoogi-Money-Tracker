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
