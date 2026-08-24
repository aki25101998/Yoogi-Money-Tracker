import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';

export const subscribePayers = (userId, callback) => createSubscription('payers', userId, callback);
export const addPayer = async (userId, data) => {
    await supabase.from('payers').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'payers' }));
};
export const updatePayer = async (userId, id, updates) => {
    await supabase.from('payers').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'payers' }));
};
export const deletePayer = async (userId, id) => {
    await supabase.from('transactions').update({ payer_id: null }).eq('payer_id', id).eq('user_id', userId);
    const { error } = await supabase.from('payers').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'payers' }));
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
};

export const subscribeDebtors = (userId, callback) => createSubscription('debtors', userId, callback);
export const addDebtor = async (userId, data) => {
    await supabase.from('debtors').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debtors' }));
};
export const deleteDebtor = async (userId, id) => {
    await supabase.from('debtors').delete().eq('id', id).eq('user_id', userId);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debtors' }));
};
export const updateDebtor = async (userId, id, updates) => {
    await supabase.from('debtors').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debtors' }));
};

export const subscribeLenders = (userId, callback) => createSubscription('lenders', userId, callback);
export const addLender = async (userId, data) => {
    await supabase.from('lenders').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'lenders' }));
};
export const updateLender = async (userId, id, updates) => {
    await supabase.from('lenders').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'lenders' }));
};
export const deleteLender = async (userId, id) => {
    await supabase.from('lenders').delete().eq('id', id).eq('user_id', userId);
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'lenders' }));
};

// ============================================================
// INSTALLMENTS
// ============================================================
export const subscribeInstallments = (userId, callback) => createSubscription('installments', userId, callback);
export const addInstallment = async (userId, data) => {
    const result = await supabase.from('installments').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'installments' }));
    return result;
};
export const updateInstallment = async (userId, id, updates) => {
    const result = await supabase.from('installments').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'installments' }));
    return result;
};
export const deleteInstallment = async (userId, id) => {
    const result = await supabase.from('installments').delete().eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'installments' }));
    return result;
};

export const updateInstallmentPartialPayment = async (userId, installmentId, monthStr, diffAmount) => {
    const { data, error } = await supabase.from('installments').select('partial_payments, paid_months, monthly_payment').eq('id', installmentId).eq('user_id', userId).single();
    if (error) throw error;
    
    const partials = data.partial_payments || {};
    const current = parseFloat(partials[monthStr]) || 0;
    const newTotal = Math.max(0, current + diffAmount);
    partials[monthStr] = newTotal;
    
    let newPaidMonths = data.paid_months || [];
    if (newTotal < (data.monthly_payment || 0) && newPaidMonths.includes(monthStr)) {
        newPaidMonths = newPaidMonths.filter(m => m !== monthStr);
    } else if (newTotal >= (data.monthly_payment || 0) && !newPaidMonths.includes(monthStr) && newTotal > 0) {
        newPaidMonths = [...newPaidMonths, monthStr];
    }
    
    await supabase.from('installments').update({ 
        partial_payments: partials,
        paid_months: newPaidMonths
    }).eq('id', installmentId).eq('user_id', userId);
    
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'installments' }));
};

// ============================================================