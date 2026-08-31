import { supabase } from '../config/supabase';


// ============================================================
// GENERIC HELPERS
// ============================================================
// --- MAPPING HELPERS ---
const toCamelCase = (str) => {
    if (str === 'fb_id') return 'fb_id';
    if (str === 'person_id') return 'personId';
    if (str === 'person_name') return 'personName';
    if (str === 'wallet_id') return 'walletId';
    if (str === 'to_wallet_id') return 'transferTo'; // Maps to transferTo for legacy compatibility
    if (str === 'category_id') return 'categoryId';
    if (str === 'subcategory_id') return 'subcategoryId';
    if (str === 'payer_id') return 'payerId';
    if (str === 'debtor_id') return 'debtorId';
    if (str === 'lender_id') return 'lenderId';
    if (str === 'ai_categorized') return 'aiCategorized';
    if (str === 'is_debt_payment') return 'isDebtPayment';
    if (str === 'is_default') return 'isDefault';
    if (str === 'month_start_day') return 'monthStartDay';
    if (str === 'remaining_amount') return 'remainingAmount';
    if (str === 'full_text') return 'longForm';
    if (str === 'short') return 'shortForm';
    if (str === 'context') return 'keyword';
    if (str === 'installment_months') return 'installmentMonths';
    if (str === 'interest_rate') return 'interestRate';
    if (str === 'is_recurring') return 'isRecurring';
    if (str === 'next_date') return 'nextDate';
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const toSnakeCase = (str) => {
    if (str === 'fb_id') return 'fb_id';
    if (str === 'personId') return 'person_id';
    if (str === 'personName') return 'person_name';
    if (str === 'walletId') return 'wallet_id';
    if (str === 'transferTo') return 'to_wallet_id'; // Maps transferTo to to_wallet_id
    if (str === 'toWalletId') return 'to_wallet_id'; // Just in case
    if (str === 'categoryId') return 'category_id';
    if (str === 'subcategoryId') return 'subcategory_id';
    if (str === 'payerId') return 'payer_id';
    if (str === 'debtorId') return 'debtor_id';
    if (str === 'lenderId') return 'lender_id';
    if (str === 'aiCategorized') return 'ai_categorized';
    if (str === 'isDebtPayment') return 'is_debt_payment';
    if (str === 'isDefault') return 'is_default';
    if (str === 'monthStartDay') return 'month_start_day';
    if (str === 'remainingAmount') return 'remaining_amount';
    if (str === 'longForm') return 'full_text';
    if (str === 'shortForm') return 'short';
    if (str === 'keyword') return 'context';
    if (str === 'installmentMonths') return 'installment_months';
    if (str === 'interestRate') return 'interest_rate';
    if (str === 'isRecurring') return 'is_recurring';
    if (str === 'nextDate') return 'next_date';
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const mapToCamelCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToCamelCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toCamelCase(key)] = obj[key];
        }
        // Backward compatibility: old debt transactions saved debt_id in installment_id
        if (newObj.type && ['loan_given', 'loan_repaid', 'debt'].includes(newObj.type)) {
            if (newObj.installmentId && !newObj.debtId) {
                newObj.debtId = newObj.installmentId;
                delete newObj.installmentId;
            }
        }
        return newObj;
    }
    return obj;
};

export const mapToSnakeCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToSnakeCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toSnakeCase(key)] = obj[key];
        }
        return newObj;
    }
    return obj;
};

// ============================================================

export const createSubscription = (table, userId, callback, orderCol = 'created_at', ascending = true) => {
    const fetchAll = async () => {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .order(orderCol, { ascending });
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            // Always call callback to avoid infinite loading states
            callback([]); 
        } else {
            callback(mapToCamelCase(data || []));
        }
    };
    fetchAll();

    const channel = supabase.channel(`public:${table}:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `user_id=eq.${userId}` }, payload => {
            fetchAll();
        })
        .subscribe();

    const handleLocalChange = (e) => {
        const targetTable = typeof e.detail === 'string' ? e.detail : e.detail?.table;
        if (targetTable === table || targetTable === 'all') fetchAll();
    };
    window.addEventListener('supabase_mutate', handleLocalChange);

    // Auto-refresh when tab becomes visible (handles cross-device changes)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            fetchAll();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic polling every 30s as fallback for Realtime delays (only when tab is visible)
    const pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') fetchAll();
    }, 30000);

    return () => { 
        supabase.removeChannel(channel); 
        window.removeEventListener('supabase_mutate', handleLocalChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(pollInterval);
    };
};

// ============================================================
// ABBREVIATIONS
// ============================================================
export const subscribeAbbreviations = (userId, callback) => createSubscription('abbreviations', userId, callback);
export const addAbbreviation = async (userId, data) => {
    const { error } = await supabase.from('abbreviations').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'abbreviations' }));
};
export const deleteAbbreviation = async (userId, id) => {
    const { error } = await supabase.from('abbreviations').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'abbreviations' }));
};

// ============================================================
// USER SETTINGS
// ============================================================
export const subscribeUserSettings = (userId, callback) => createSubscription('settings', userId, (data) => {
    callback(data.length > 0 ? data[0] : { monthStartDay: 1 });
});
export const updateUserSettings = async (userId, updates) => await supabase.from('settings').update(mapToSnakeCase(updates)).eq('user_id', userId);

// ============================================================
// OTHER MISSING EXPORTS TO FIX BUILD
// ============================================================
export const updateAbbreviation = async (userId, id, updates) => {
    const { error } = await supabase.from('abbreviations').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'abbreviations' }));
};

const TABLES_DELETE_ORDER = [
    'transactions', 'recurring_transactions', 'debts', 'installments', 'wallets', 
    'categories', 'payers', 'debtors', 'lenders', 'ai_memory', 'abbreviations', 'settings'
];

const TABLES_INSERT_ORDER = [
    'settings', 'abbreviations', 'ai_memory', 'lenders', 'debtors', 'payers', 
    'categories', 'wallets', 'installments', 'debts', 'recurring_transactions', 'transactions'
];

export const exportUserData = async (userId) => {
    const data = {};
    for (const table of TABLES_INSERT_ORDER) {
        const { data: rows, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (!error) {
            data[table] = rows || [];
        }
    }
    return data;
};

export const importUserData = async (userId, data) => {
    // 1. Delete existing data
    for (const table of TABLES_DELETE_ORDER) {
        const { data: ids } = await supabase.from(table).select('id').eq('user_id', userId);
        if (ids && ids.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < ids.length; i += chunkSize) {
                const chunk = ids.slice(i, i + chunkSize).map(r => r.id);
                await supabase.from(table).delete().in('id', chunk);
            }
        }
    }
    
    // 2. Insert new data
    for (const table of TABLES_INSERT_ORDER) {
        if (data[table] && data[table].length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < data[table].length; i += chunkSize) {
                const chunk = data[table].slice(i, i + chunkSize);
                await supabase.from(table).insert(chunk);
            }
        }
    }
    
    // Dispatch events to refresh UI
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'all' }));
        setTimeout(() => window.location.reload(), 1000);
    }
};

// ============================================================
// VERSION HISTORY
// ============================================================
export const fetchVersions = async (userId) => {
    const { data, error } = await supabase
        .from('version_history')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveVersion = async (userId, name) => {
    const { error } = await supabase.rpc('create_version_snapshot', {
        p_user_id: userId,
        p_name: name || 'Bản lưu thủ công'
    });
    if (error) {
        console.error('RPC create_version_snapshot failed, falling back to client-side export', error);
        const data = await exportUserData(userId);
        const { error: insertError } = await supabase
            .from('version_history')
            .insert([{ user_id: userId, name: name || 'Bản lưu thủ công', data }]);
        if (insertError) throw insertError;
    }
};

export const cleanupOldAutoVersions = async (userId) => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { error } = await supabase
        .from('version_history')
        .delete()
        .eq('user_id', userId)
        .eq('name', 'Tự động lưu')
        .lt('created_at', threeDaysAgo.toISOString());
        
    if (error) {
        console.error("Error cleaning up old auto versions:", error);
    }
};

export const restoreVersion = async (userId, versionId) => {
    const { data: versionData, error } = await supabase
        .from('version_history')
        .select('data')
        .eq('id', versionId)
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    
    await importUserData(userId, versionData.data);
};

// --- CATEGORY TEMPLATES (Saved in abbreviations for convenience) ---