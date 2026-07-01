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

export const calculateItemStats = (item, referenceDate = new Date()) => {
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
        if (item.partialPayments) {
            for (const [mStr, amount] of Object.entries(item.partialPayments)) {
                if (!item.paidMonths.includes(mStr)) {
                    totalPartialPaid += amount;
                }
            }
        }
        
        paidAmount += totalPartialPaid;
        const remainingAmount = item.totalPayable - paidAmount;

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
    const remainingAmount = item.totalPayable - paidAmount;
    const progress = (effectiveMonths / item.term) * 100;
    const isFinished = effectiveMonths >= item.term;

    return { monthsPassed, effectiveMonths, paidAmount, remainingAmount, progress, isFinished };
};
