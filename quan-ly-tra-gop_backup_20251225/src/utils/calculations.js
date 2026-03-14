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

export const calculateItemStats = (item, referenceDate = new Date()) => {
    const start = new Date(item.startDate);
    const now = new Date(referenceDate); // Ensure it's a Date object
    let monthsPassed = monthDiff(start, now);

    // Logic fix: monthDiff returns 0 if d2 < d1, which is fine, but strictly:
    if (now < start) monthsPassed = 0;

    // Use passed months directly. monthDiff calculates full months difference based on Year/Month.
    // If we are in the same month, monthsPassed is 0.
    // Assuming payment is made? Usually "Month 1" payment happens in Month 1.
    // If I am IN Month 1 (e.g. Start Jan, Current Jan), diff is 0.
    // But typically "First Installment" is due.
    // If UI says "Paid: 0", "Remaining: Full". That implies start of month.
    // If user wants to see "End of March projection", they might pick April?
    // Let's stick to standard "As of date" snapshot.
    // Exception: If we want "monthsPassed" to include current month if late? 
    // No, keep it simple. Start Jan 1. Ref Feb 1. Diff 1. Paid 1.

    const effectiveMonths = Math.min(monthsPassed, item.term);
    const paidAmount = effectiveMonths * item.monthlyPayment;
    const remainingAmount = item.totalPayable - paidAmount;
    const progress = (effectiveMonths / item.term) * 100;
    const isFinished = effectiveMonths >= item.term;

    return { monthsPassed, effectiveMonths, paidAmount, remainingAmount, progress, isFinished };
};
