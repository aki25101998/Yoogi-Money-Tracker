const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils/supabaseHelpers.js');
let content = fs.readFileSync(filePath, 'utf8');

const splitPoint = "export const updateCategoryOrder = async (userId, orderedIds) => {";
const splitIndex = content.indexOf(splitPoint);

if (splitIndex !== -1) {
    // Find the end of updateCategoryOrder function
    const endBraceIndex = content.indexOf('};', splitIndex);
    if (endBraceIndex !== -1) {
        const topHalf = content.substring(0, endBraceIndex + 2);
        
        const bottomHalf = `

// ============================================================
// TRANSACTIONS
// ============================================================
export const subscribeTransactions = (userId, callback) => createSubscription('transactions', userId, callback, 'date', false);

export const addTransaction = async (userId, data) => await supabase.from('transactions').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updateTransaction = async (userId, id, updates) => await supabase.from('transactions').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deleteTransaction = async (userId, id) => await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
export const getTransactionByDebtId = async (userId, debtId) => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('installment_id', debtId);
    return data;
};
export const deleteMultipleTransactions = async (userId, ids) => await supabase.from('transactions').delete().in('id', ids).eq('user_id', userId);

// ============================================================
// DEBTS
// ============================================================
export const subscribeDebts = (userId, callback) => createSubscription('debts', userId, (data) => {
    callback(data.map(d => ({
        ...d,
        totalAmount: d.amount,
        repaidAmount: d.amount - (d.remainingAmount || 0),
        notes: d.note
    })));
}, 'date', false);

export const addDebt = async (userId, data) => {
    const toSave = { ...data };
    toSave.amount = data.totalAmount;
    toSave.remaining_amount = data.totalAmount - (data.repaidAmount || 0);
    if (data.notes !== undefined) toSave.note = data.notes;
    delete toSave.totalAmount;
    delete toSave.repaidAmount;
    delete toSave.notes;
    return await supabase.from('debts').insert([mapToSnakeCase({ ...toSave, user_id: userId })]);
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
    return await supabase.from('debts').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId);
};

export const deleteDebt = async (userId, id) => await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);

// ============================================================
// RECURRING TRANSACTIONS
// ============================================================
export const subscribeRecurringTransactions = (userId, callback) => createSubscription('recurring_transactions', userId, callback, 'next_date', true);
export const addRecurringTransaction = async (userId, data) => await supabase.from('recurring_transactions').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updateRecurringTransaction = async (userId, id, updates) => await supabase.from('recurring_transactions').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deleteRecurringTransaction = async (userId, id) => await supabase.from('recurring_transactions').delete().eq('id', id).eq('user_id', userId);

// ============================================================
// WALLETS
// ============================================================
export const subscribeWallets = (userId, callback) => createSubscription('wallets', userId, callback);
export const addWallet = async (userId, data) => await supabase.from('wallets').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updateWallet = async (userId, id, updates) => await supabase.from('wallets').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deleteWallet = async (userId, id) => await supabase.from('wallets').delete().eq('id', id).eq('user_id', userId);

// ============================================================
// PAYERS, DEBTORS, LENDERS
// ============================================================
export const subscribePayers = (userId, callback) => createSubscription('payers', userId, callback);
export const addPayer = async (userId, data) => await supabase.from('payers').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updatePayer = async (userId, id, updates) => await supabase.from('payers').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deletePayer = async (userId, id) => await supabase.from('payers').delete().eq('id', id).eq('user_id', userId);

export const subscribeDebtors = (userId, callback) => createSubscription('debtors', userId, callback);
export const addDebtor = async (userId, data) => await supabase.from('debtors').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const deleteDebtor = async (userId, id) => await supabase.from('debtors').delete().eq('id', id).eq('user_id', userId);
export const updateDebtor = async (userId, id, updates) => await supabase.from('debtors').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);

export const subscribeLenders = (userId, callback) => createSubscription('lenders', userId, callback);
export const addLender = async (userId, data) => await supabase.from('lenders').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const updateLender = async (userId, id, updates) => await supabase.from('lenders').update(mapToSnakeCase(updates)).eq('id', id).eq('user_id', userId);
export const deleteLender = async (userId, id) => await supabase.from('lenders').delete().eq('id', id).eq('user_id', userId);

// ============================================================
// ABBREVIATIONS
// ============================================================
export const subscribeAbbreviations = (userId, callback) => createSubscription('abbreviations', userId, callback);
export const addAbbreviation = async (userId, data) => await supabase.from('abbreviations').insert([mapToSnakeCase({ ...data, user_id: userId })]);
export const deleteAbbreviation = async (userId, id) => await supabase.from('abbreviations').delete().eq('id', id).eq('user_id', userId);
`;

        fs.writeFileSync(filePath, topHalf + bottomHalf);
        console.log("File fixed successfully!");
    } else {
        console.log("Could not find the end of updateCategoryOrder");
    }
} else {
    console.log("Could not find the split point updateCategoryOrder");
}
