import { supabase } from '../config/supabase';
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './defaultCategories';

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

const createSubscription = (table, userId, callback, orderCol = 'created_at', ascending = true) => {
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
        if (e.detail === table) fetchAll();
    };
    window.addEventListener('supabase_mutate', handleLocalChange);

    return () => { 
        supabase.removeChannel(channel); 
        window.removeEventListener('supabase_mutate', handleLocalChange);
    };
};

// ============================================================
// CATEGORIES
// ============================================================

export const seedDefaultCategories = async (userId) => {
    const { data } = await supabase.from('categories').select('id').eq('user_id', userId);
    if (data && data.length > 0) return false;

    // Insert categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        order: cat.order,
        subcategories: cat.subcategories,
        user_id: userId
    }));
    await supabase.from('categories').insert(mapToSnakeCase(categoriesToInsert));

    // Insert wallets
    const { data: wallets } = await supabase.from('wallets').select('id').eq('user_id', userId);
    if (!wallets || wallets.length === 0) {
        const walletsToInsert = DEFAULT_WALLETS.map(w => ({
            ...w,
            user_id: userId,
            id: undefined
        }));
        await supabase.from('wallets').insert(mapToSnakeCase(walletsToInsert));
    }

    // Insert payer
    const { data: payers } = await supabase.from('payers').select('id').eq('user_id', userId);
    if (!payers || payers.length === 0) {
        await supabase.from('payers').insert([{ name: 'Tôi', user_id: userId }]);
    }

    // Insert settings
    await supabase.from('settings').insert([{ month_start_day: 1, user_id: userId }]);

    return true;
};

export const ensureRequiredCategories = async (userId) => {
    try {
        const { data: categories } = await supabase.from('categories').select('id, type').eq('user_id', userId);
        if (!categories) return;

        const missing = [];
        const types = categories.map(c => c.type);
        const ids = categories.map(c => c.id);

        // Required categories that might be missing for older accounts
        const required = [
            {
                id: 'tra_no_tra_gop',
                name: 'Trả nợ & Trả góp',
                icon: '💳',
                type: 'installment_repaid',
                order: 6,
                subcategories: [
                    { id: 'tra_gop', name: 'Trả góp', description: 'Trả tiền mua trả góp hàng tháng' },
                    { id: 'tra_no_vay', name: 'Trả nợ vay', description: 'Trả nợ tiền mặt đã vay' }
                ],
                user_id: userId
            },
            {
                id: 'loan_given',
                name: 'Cho mượn',
                icon: '📤',
                type: 'loan_given',
                order: 1,
                subcategories: [],
                user_id: userId
            },
            {
                id: 'loan_repaid',
                name: 'Nhận trả nợ',
                icon: '📥',
                type: 'loan_repaid',
                order: 2,
                subcategories: [],
                user_id: userId
            }
        ];

        for (const req of required) {
            // Check if it exists either by type OR by exact id
            if (!types.includes(req.type) && !ids.includes(req.id)) {
                missing.push(mapToSnakeCase(req));
            }
        }

        if (missing.length > 0) {
            await supabase.from('categories').insert(missing);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
        }
    } catch (error) {
        console.error('Error ensuring required categories:', error);
    }
};

export const subscribeCategories = (userId, callback) => createSubscription('categories', userId, callback, 'order', true);

export const addCategory = async (userId, data) => {
    const result = await supabase.from('categories').insert([mapToSnakeCase({ ...data, user_id: userId })]);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
    return result;
};
export const updateCategory = async (userId, id, updates) => {
    const result = await supabase.from('categories').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
    return result;
};
export const deleteCategory = async (userId, id) => {
    const result = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
    return result;
};
export const updateCategoryOrder = async (userId, orderedIds) => {
    // Bulk update not directly supported in single call easily without RPC, so we do it in a loop
    for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from('categories').update({ order: i }).eq('id', orderedIds[i]).eq('user_id', userId);
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
};

// ============================================================
// TRANSACTIONS
// ============================================================
export const subscribeTransactions = (userId, callback) => createSubscription('transactions', userId, (data) => {
    callback(data.map(t => ({
        ...t,
        description: t.note || t.description || '',
    })));
}, 'date', false);

export const addTransaction = async (userId, data) => {
    const toSave = { ...data };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    delete toSave.time;
    const { data: result, error } = await supabase.from('transactions').insert([mapToSnakeCase({ ...toSave, user_id: userId })]).select().single();
    if (error) throw error;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
    return mapToCamelCase(result);
};
export const updateTransaction = async (userId, id, updates) => {
    const toSave = { ...updates };
    if (toSave.description !== undefined) {
        toSave.note = toSave.description;
        delete toSave.description;
    }
    delete toSave.time;
    const result = await supabase.from('transactions').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
    return result;
};
export const deleteTransaction = async (userId, id, txn = null) => {
    if (txn) {
        if (txn.type === 'loan_repaid' && txn.debtId) {
            const { data: debt } = await supabase.from('debts').select('amount, remaining_amount, status').eq('id', txn.debtId).single();
            if (debt) {
                const repaidAmount = debt.amount - (debt.remaining_amount || 0);
                const newRepaidAmount = Math.max(0, repaidAmount - txn.amount);
                const newStatus = newRepaidAmount >= debt.amount ? 'paid' : 'active';
                // Inline update Debt to avoid circular dependency or import issues if any, 
                // but we can just use supabase directly here.
                await supabase.from('debts').update({
                    remaining_amount: debt.amount - newRepaidAmount,
                    status: newStatus
                }).eq('id', txn.debtId).eq('user_id', userId);
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));
            }
        } else if (txn.type === 'loan_given' && (txn.debtId || txn.installmentId)) {
            return await deleteDebt(userId, txn.debtId || txn.installmentId);
        } else if (txn.type === 'installment_repaid' && txn.installmentId) {
            const txMonthStr = txn.date ? `${new Date(txn.date).getFullYear()}-${String(new Date(txn.date).getMonth() + 1).padStart(2, '0')}` : null;
            if (txMonthStr) {
                await updateInstallmentPartialPayment(userId, txn.installmentId, txMonthStr, -txn.amount);
            }
        }
    }

    const result = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'transactions' }));
    return result;
};
export const getTransactionByDebtId = async (userId, debtId) => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', userId).or(`debt_id.eq.${debtId},installment_id.eq.${debtId}`);
    return data;
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
                const txMonthStr = txn.date ? `${new Date(txn.date).getFullYear()}-${String(new Date(txn.date).getMonth() + 1).padStart(2, '0')}` : null;
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
// PAYERS, DEBTORS, LENDERS
// ============================================================
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
// AI MEMORY
// ============================================================
export const subscribeAIMemory = (userId, callback) => createSubscription('ai_memory', userId, callback);

// ============================================================
// INSTALLMENTS
// ============================================================
export const subscribeInstallments = (userId, callback) => createSubscription('installments', userId, callback);
export const addInstallment = async (userId, data) => await supabase.from('installments').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updateInstallment = async (userId, id, updates) => await supabase.from('installments').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deleteInstallment = async (userId, id) => await supabase.from('installments').delete().eq('id', id).eq('user_id', userId);

export const updateInstallmentPartialPayment = async (userId, installmentId, monthStr, diffAmount) => {
    const { data, error } = await supabase.from('installments').select('partial_payments').eq('id', installmentId).eq('user_id', userId).single();
    if (error) throw error;
    
    const partials = data.partial_payments || {};
    const current = parseFloat(partials[monthStr]) || 0;
    partials[monthStr] = current + diffAmount;
    
    await supabase.from('installments').update({ partial_payments: partials }).eq('id', installmentId).eq('user_id', userId);
};

// ============================================================
// OTHER MISSING EXPORTS TO FIX BUILD
// ============================================================
export const processCorrections = async (userId, data) => { return data; };
export const updateWalletOrder = async (userId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from('wallets').update({ order: i }).eq('id', orderedIds[i]).eq('user_id', userId);
    }
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'wallets' }));
};
export const applyDefaultWallets = async (userId) => {};
export const applyDefaultCategories = async (userId) => {};

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

export const updateAbbreviation = async (userId, id, updates) => {
    const { error } = await supabase.from('abbreviations').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'abbreviations' }));
};

export const exportUserData = async (userId) => ({});
export const importUserData = async (userId, data) => {};

