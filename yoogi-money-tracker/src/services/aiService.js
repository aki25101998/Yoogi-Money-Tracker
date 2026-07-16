import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';

// AI MEMORY
// ============================================================
export const subscribeAIMemory = (userId, callback) => createSubscription('ai_memory', userId, callback);

// ============================================================
export const addAIMemory = async (userId, data) => {
    const { error } = await supabase.from('ai_memory').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'ai_memory' }));
};
export const updateAIMemory = async (userId, id, updates) => {
    const { error } = await supabase.from('ai_memory').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'ai_memory' }));
};
export const deleteAIMemory = async (userId, id) => {
    const { error } = await supabase.from('ai_memory').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'ai_memory' }));
};
export const incrementMemoryUsage = async (userId, id) => {};
export const learnFromCorrection = async (userId, keyword, categoryId, subcategoryId) => {
    if (!keyword || !categoryId) return;
    
    const normalizedKeyword = keyword.trim().toLowerCase();
    
    // Check if memory already exists
    const { data: existing } = await supabase.from('ai_memory').select('id').eq('user_id', userId).eq('context', normalizedKeyword).maybeSingle();
    
    if (existing) {
        await updateAIMemory(userId, existing.id, {
            categoryId,
            subcategoryId: subcategoryId || ''
        });
    } else {
        await addAIMemory(userId, {
            keyword: normalizedKeyword,
            categoryId,
            subcategoryId: subcategoryId || '',
            usageCount: 1
        });
    }
};

export const subscribeAIChatHistory = (userId, walletId, callback) => { 
    const fetchHistory = async () => {
        const { data, error } = await supabase.from('ai_chat_history').select('history').eq('user_id', userId).eq('wallet_id', walletId).maybeSingle();
        if (data && data.history && data.history.length > 0) {
            callback(data.history);
        } else {
            callback(null);
        }
    };
    fetchHistory();
    return () => {};
};

export const updateAIChatHistory = async (userId, walletId, history) => {
    const { error } = await supabase.from('ai_chat_history').upsert({
        user_id: userId,
        wallet_id: walletId,
        history: history,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, wallet_id' });
    if (error) console.error("Error saving chat history", error);
};

export const clearAIChatHistory = async (userId, walletId) => {
    await supabase.from('ai_chat_history').update({ history: [] }).eq('user_id', userId).eq('wallet_id', walletId);
};
