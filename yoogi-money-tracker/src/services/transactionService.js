import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';
import { deleteDebt } from './debtService';
import { updateInstallmentPartialPayment } from './installmentService';
import { getInstallmentPaymentMonth } from '../utils/transactionUtils';

// TRANSACTIONS
// ============================================================
export const subscribeTransactions = (userId, callback) => createSubscription('transactions', userId, (data) => {
    callback(data.map(t => ({
        ...t,
        description: t.note || t.description || '',
    })));
}, 'date', false);

// ==========================================
// @AI-WARNING: CRITICAL CORE LOGIC
// DO NOT MODIFY THIS FUNCTION WITHOUT EXPLICIT PERMISSION FROM USER.
// HÀM NÀY XỬ LÝ LƯU GIAO DỊCH LÊN DATABASE VÀ KIỂM SOÁT THÊM/SỬA KỲ HẠN, CÔNG NỢ.
// ĐẢM BẢO LUÔN CÓ dispatchEvent('supabase_mutate') SAU KHI THÀNH CÔNG.
// ==========================================
export const addTransaction = async (userId, data) => {
    const toSave = { ...data };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    delete toSave.time;
    delete toSave.personName;
    if (toSave.categoryId === '') toSave.categoryId = null;
    if (toSave.subcategoryId === '') toSave.subcategoryId = null;
    if (toSave.walletId === '') toSave.walletId = null;
    const { data: result, error } = await supabase.from('transactions').insert([mapToSnakeCase({ ...toSave, user_id: userId })]).select().single();
    if (error) throw error;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { 
        detail: { table: 'transactions', action: `Thêm giao dịch ${toSave.note || ''}`.trim() }
    }));
    return mapToCamelCase(result);
};
export const updateTransaction = async (userId, id, updates) => {
    // Lấy transaction cũ để so sánh diff nếu là trả góp
    const { data: oldTxn } = await supabase.from('transactions').select('*').eq('id', id).eq('user_id', userId).single();

    const toSave = { ...updates };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    delete toSave.time;
    delete toSave.personName;
    if (toSave.categoryId === '') toSave.categoryId = null;
    if (toSave.subcategoryId === '') toSave.subcategoryId = null;
    if (toSave.walletId === '') toSave.walletId = null;
    const { data: result, error } = await supabase.from('transactions').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    
    // Cập nhật chênh lệch cho trả góp
    if (oldTxn && oldTxn.type === 'installment_repaid' && updates.amount !== undefined) {
        const diffAmount = updates.amount - oldTxn.amount;
        if (diffAmount !== 0 && oldTxn.installment_id) {
            const txMonthStr = getInstallmentPaymentMonth(mapToCamelCase(oldTxn));
            if (txMonthStr) {
                await updateInstallmentPartialPayment(userId, oldTxn.installment_id, txMonthStr, diffAmount);
            }
        }
    }

    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { 
        detail: { table: 'transactions', action: `Cập nhật giao dịch ${toSave.note || ''}`.trim() }
    }));
    return result;
};
export const deleteTransaction = async (userId, id, txn = null) => {
    let txnToDelete = txn;
    if (!txnToDelete) {
        const { data } = await supabase.from('transactions').select('*').eq('id', id).eq('user_id', userId).single();
        if (data) txnToDelete = mapToCamelCase(data);
    }

    if (txnToDelete) {
        if (txnToDelete.type === 'loan_repaid' && txnToDelete.debtId) {
            const { data: debt } = await supabase.from('debts').select('amount, remaining_amount, status').eq('id', txnToDelete.debtId).single();
            if (debt) {
                const repaidAmount = debt.amount - (debt.remaining_amount || 0);
                const newRepaidAmount = Math.max(0, repaidAmount - txnToDelete.amount);
                const newStatus = newRepaidAmount >= debt.amount ? 'paid' : 'active';
                // Inline update Debt to avoid circular dependency or import issues if any, 
                // but we can just use supabase directly here.
                await supabase.from('debts').update({
                    remaining_amount: debt.amount - newRepaidAmount,
                    status: newStatus
                }).eq('id', txnToDelete.debtId).eq('user_id', userId);
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
            }
        } else if (txnToDelete.type === 'loan_given' && (txnToDelete.debtId || txnToDelete.installmentId)) {
            return await deleteDebt(userId, txnToDelete.debtId || txnToDelete.installmentId);
        } else if (txnToDelete.type === 'installment_repaid' && txnToDelete.installmentId) {
            const txMonthStr = getInstallmentPaymentMonth(txnToDelete);
            if (txMonthStr) {
                await updateInstallmentPartialPayment(userId, txnToDelete.installmentId, txMonthStr, -txnToDelete.amount);
            }
        }
    }

    const result = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { 
        detail: { table: 'transactions', action: `Xóa giao dịch ${txnToDelete ? (txnToDelete.note || txnToDelete.description || '') : ''}`.trim() }
    }));
    return result;
};
export const getTransactionByDebtId = async (userId, debtId) => {
    const { data } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', userId)
        .or('debt_id.eq.' + debtId + ',installment_id.eq.' + debtId)
        .eq('type', 'loan_given')
        .limit(1);
    return data && data.length > 0 ? mapToCamelCase(data[0]) : null;
};
export const deleteMultipleTransactions = async (userId, ids) => {
    // Revert side effects for loan and installment repayments
    const { data: txnsToRevert } = await supabase.from('transactions').select('*').in('id', ids).eq('user_id', userId);
    if (txnsToRevert && txnsToRevert.length > 0) {
        for (const t of txnsToRevert) {
            const txn = mapToCamelCase(t);
            if (txn.type === 'loan_repaid' && txn.debtId) {
                const { data: debt } = await supabase.from('debts').select('amount, remaining_amount, status').eq('id', txn.debtId).single();
                if (debt) {
                    const repaidAmount = debt.amount - (debt.remaining_amount || 0);
                    const newRepaidAmount = Math.max(0, repaidAmount - txn.amount);
                    const newStatus = newRepaidAmount >= debt.amount ? 'paid' : 'active';
                    await supabase.from('debts').update({
                        remaining_amount: debt.amount - newRepaidAmount,
                        status: newStatus
                    }).eq('id', txn.debtId).eq('user_id', userId);
                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
                }
            } else if (txn.type === 'installment_repaid' && txn.installmentId) {
                const txMonthStr = getInstallmentPaymentMonth(txn);
                if (txMonthStr) {
                    await updateInstallmentPartialPayment(userId, txn.installmentId, txMonthStr, -txn.amount);
                }
            } else if (txn.type === 'loan_given' && (txn.debtId || txn.installmentId)) {
                await deleteDebt(userId, txn.debtId || txn.installmentId);
            }
        }
    }

    const result = await supabase.from('transactions').delete().in('id', ids).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
    return result;
};

// ============================================================
// RECURRING TRANSACTIONS
// ============================================================
export const subscribeRecurringTransactions = (userId, callback) => createSubscription('recurring_transactions', userId, (data) => {
    callback(data.map(rt => ({
        ...rt,
        description: rt.note || rt.description || '',
    })));
}, 'next_date', true);
export const addRecurringTransaction = async (userId, data) => {
    const toSave = { ...data };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    return await supabase.from('recurring_transactions').insert([mapToSnakeCase({ ...toSave, user_id: userId })]);
};

export const updateRecurringTransaction = async (userId, id, updates) => {
    const toSave = { ...updates };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    return await supabase.from('recurring_transactions').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId);
};
export const deleteRecurringTransaction = async (userId, id) => await supabase.from('recurring_transactions').delete().eq('id', id).eq('user_id', userId);

// ============================================================
export const processCorrections = async (userId, data) => { return data; };