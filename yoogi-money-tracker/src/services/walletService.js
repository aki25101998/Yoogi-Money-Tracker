import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';
import { DEFAULT_WALLETS } from '../utils/defaultCategories';

// WALLETS
// ============================================================
export const subscribeWallets = (userId, callback) => createSubscription('wallets', userId, callback, 'order', true);
export const addWallet = async (userId, data) => {
    const { error } = await supabase.from('wallets').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'wallets' }));
};
export const updateWallet = async (userId, id, updates) => {
    const { error } = await supabase.from('wallets').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'wallets' }));
};
export const deleteWallet = async (userId, id) => {
    await supabase.from('ai_chat_history').delete().eq('wallet_id', id).eq('user_id', userId);
    await supabase.from('transactions').update({ wallet_id: null }).eq('wallet_id', id).eq('user_id', userId);
    await supabase.from('transactions').update({ to_wallet_id: null }).eq('to_wallet_id', id).eq('user_id', userId);
    await supabase.from('debts').update({ wallet_id: null }).eq('wallet_id', id).eq('user_id', userId);
    await supabase.from('recurring_transactions').update({ wallet_id: null }).eq('wallet_id', id).eq('user_id', userId);
    const { error } = await supabase.from('wallets').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'wallets' }));
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
};

// ============================================================
export const updateWalletOrder = async (userId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from('wallets').update({ order: i }).eq('id', orderedIds[i]).eq('user_id', userId);
    }
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'wallets' }));
};
export const applyDefaultWallets = async (userId) => {};