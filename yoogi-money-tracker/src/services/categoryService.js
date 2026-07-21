import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from '../utils/defaultCategories';


// CATEGORIES
// ============================================================

let isSeeding = false;
let isEnsuring = false;

export const seedDefaultCategories = async (userId) => {
    if (isSeeding) return false;
    isSeeding = true;
    try {
        const { data, error } = await supabase.from('categories').select('id').eq('user_id', userId);
        if (error) {
            console.error('Error fetching categories during seed:', error);
            return false;
        }
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
        const { data: wallets, error: wError } = await supabase.from('wallets').select('id').eq('user_id', userId);
        if (!wError && (!wallets || wallets.length === 0)) {
            const walletsToInsert = DEFAULT_WALLETS.map(w => ({
                ...w,
                user_id: userId,
                id: undefined
            }));
            await supabase.from('wallets').insert(mapToSnakeCase(walletsToInsert));
        }

        // Insert payer
        const { data: payers, error: pError } = await supabase.from('payers').select('id').eq('user_id', userId);
        if (!pError && (!payers || payers.length === 0)) {
            await supabase.from('payers').insert([{ name: 'Tôi', user_id: userId }]);
        }

        // Insert settings
        const { data: settings, error: sError } = await supabase.from('settings').select('id').eq('user_id', userId);
        if (!sError && (!settings || settings.length === 0)) {
            await supabase.from('settings').insert([{ month_start_day: 1, user_id: userId }]);
        }

        return true;
    } finally {
        isSeeding = false;
    }
};


export const ensureRequiredCategories = async (userId) => {
    if (isEnsuring) return;
    isEnsuring = true;
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
    } finally {
        isEnsuring = false;
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
export const applyDefaultCategories = async (userId) => {
    // 1. Delete existing categories for the user
    const { error: delError } = await supabase.from('categories').delete().eq('user_id', userId);
    if (delError) {
        console.error("Delete error:", delError);
        throw new Error("Không thể xóa danh mục cũ: " + delError.message);
    }

    // 2. Insert new default categories (let DB generate random UUIDs for ID)
    const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        order: cat.order,
        subcategories: cat.subcategories,
        user_id: userId
    }));
    
    const { error: insError } = await supabase.from('categories').insert(mapToSnakeCase(categoriesToInsert));
    if (insError) {
        console.error("Insert error:", insError);
        throw new Error("Không thể thêm danh mục mới: " + insError.message);
    }

    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
    return categoriesToInsert.length;
};

export const getCategoryTemplates = async (userId) => {
    const { data, error } = await supabase
        .from('abbreviations')
        .select('id, short, full_text')
        .eq('user_id', userId)
        .like('short', 'TEMPLATE:%');
    if (error) throw error;
    return data.map(d => ({
        id: d.id,
        name: d.short.replace('TEMPLATE:', ''),
        categories: JSON.parse(d.full_text)
    }));
};

export const saveCategoryTemplate = async (userId, name, categoriesData) => {
    // Clean up IDs before saving to prevent conflicts when loading later
    const cleanCategories = categoriesData.map(cat => ({
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        order: cat.order,
        subcategories: (cat.subcategories || []).map(sc => ({
            name: sc.name,
            description: sc.description || ''
        }))
    }));

    const { error } = await supabase.from('abbreviations').insert([mapToSnakeCase({
        short: `TEMPLATE:${name}`,
        full_text: JSON.stringify(cleanCategories),
        user_id: userId
    })]);
    if (error) throw error;
};

export const deleteCategoryTemplate = async (userId, id) => {
    const { error } = await supabase.from('abbreviations').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
};

export const applyCategoryTemplate = async (userId, categoriesToInsert) => {
    // 1. Delete existing categories for the user
    const { error: delError } = await supabase.from('categories').delete().eq('user_id', userId);
    if (delError) {
        throw new Error("Không thể xóa danh mục cũ: " + delError.message);
    }

    // 2. Insert new categories from template
    const toInsert = categoriesToInsert.map(cat => ({
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        order: cat.order,
        subcategories: cat.subcategories,
        user_id: userId
    }));
    
    const { error: insError } = await supabase.from('categories').insert(mapToSnakeCase(toInsert));
    if (insError) {
        throw new Error("Không thể thêm danh mục mới: " + insError.message);
    }

    window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'categories' }));
};
