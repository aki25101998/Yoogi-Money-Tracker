import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';

// DEBTS
// ============================================================
export const subscribeDebts = (userId, callback) => createSubscription('debts', userId, (data) => {
    callback(data.map(d => {
        const totalAmount = d.amount;
        const repaidAmount = d.amount - (d.remainingAmount || 0);
        // Tự động sửa lại status nếu đã trả đủ nhưng trong DB vẫn lưu là 'active' do lỗi migration
        const status = repaidAmount >= totalAmount ? 'paid' : (d.status || 'active');
        return {
            ...d,
            totalAmount,
            repaidAmount,
            status,
            notes: d.note
        };
    }));
}, 'date', false);

export const addDebt = async (userId, data) => {
    const toSave = { ...data };
    toSave.type = data.type || 'loan';
    toSave.amount = data.totalAmount;
    toSave.remaining_amount = data.totalAmount - (data.repaidAmount || 0);
    if (data.notes !== undefined) toSave.note = data.notes;
    delete toSave.totalAmount;
    delete toSave.repaidAmount;
    delete toSave.notes;
    const { data: result, error } = await supabase.from('debts').insert([mapToSnakeCase({ ...toSave, user_id: userId })]).select().single();
    if (error) throw error;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
    return mapToCamelCase(result);
};

export const updateDebt = async (userId, id, updates) => {
    const toSave = { ...updates };
    if (updates.totalAmount !== undefined) {
        toSave.amount = updates.totalAmount;
        delete toSave.totalAmount;
    }
    if (updates.repaidAmount !== undefined) {
        let amount = toSave.amount;
        if (amount === undefined) {
            const { data: debt } = await supabase.from('debts').select('amount').eq('id', id).single();
            amount = debt?.amount || 0;
        }
        toSave.remaining_amount = amount - updates.repaidAmount;
        delete toSave.repaidAmount;
    }
    if (updates.notes !== undefined) {
        toSave.note = updates.notes;
        delete toSave.notes;
    }
    const result = await supabase.from('debts').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
    return result;
};

export const deleteDebt = async (userId, id) => {
    // Xóa các giao dịch liên quan đến khoản nợ này trước
    await supabase.from('transactions').delete().eq('debt_id', id).eq('user_id', userId);
    // Cleanup cũ do mapping sai trước đây (lưu debtId vào installment_id)
    await supabase.from('transactions').delete().eq('installment_id', id).in('type', ['loan_given', 'loan_repaid', 'debt']).eq('user_id', userId);
    
    const result = await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
        window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
    }
    return result;
};

// ============================================================
// PAYERS, DEBTORS, LENDERS
// ============================================================