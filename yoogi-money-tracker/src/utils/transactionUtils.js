/**
 * Centralized transaction taxonomy and helper functions.
 */

export const isExpenseTransaction = (t) => {
    if (!t) return false;
    return t.type === 'expense' || t.type === 'installment_repaid';
};

export const isIncomeTransaction = (t) => {
    if (!t) return false;
    return t.type === 'income';
};

export const isInstallmentPayment = (t) => {
    if (!t) return false;
    return t.type === 'installment_repaid';
};

export const isTransferTransaction = (t) => {
    if (!t) return false;
    return t.type === 'transfer';
};

export const isLoanTransaction = (t) => {
    if (!t) return false;
    return t.type === 'loan_given' || t.type === 'loan_repaid';
};

/**
 * Standardize getting the payment month string ('YYYY-MM') from a transaction.
 * Follows the same logic as the rest of the application.
 * Priority: description T(MM/YYYY) -> T(MM) -> date.
 */
export const getInstallmentPaymentMonth = (txn) => {
    if (!txn) return null;
    let txMonthStr = null;
    
    if (txn.paymentMonth) {
        return txn.paymentMonth; // Future proofing
    }

    const match = txn.description?.match(/\(T(\d{2})\/(\d{4})\)$/);
    if (match) {
        txMonthStr = `${match[2]}-${match[1]}`;
    } else if (txn.description?.match(/\(T(\d{2})\)$/)) {
        const m = txn.description.match(/\(T(\d{2})\)$/)[1];
        txMonthStr = txn.date ? `${new Date(txn.date).getFullYear()}-${m}` : null;
    } else {
        txMonthStr = txn.date ? `${new Date(txn.date).getFullYear()}-${String(new Date(txn.date).getMonth() + 1).padStart(2, '0')}` : null;
    }
    
    return txMonthStr;
};
