import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';

// Lấy danh sách các quy tắc ngân quỹ (budget rules) của user
export const fetchBudgetRules = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('budget_rules')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching budget rules:', error);
            throw error;
        }

        return mapToCamelCase(data);
    } catch (error) {
        console.error('Unexpected error in fetchBudgetRules:', error);
        throw error;
    }
};

// Lưu/Cập nhật danh sách quy tắc ngân quỹ
export const saveBudgetRules = async (userId, rules) => {
    try {
        // Chuẩn bị data để upsert
        const rulesToUpsert = rules.map(rule => ({
            user_id: userId,
            category_id: rule.categoryId,
            percentage: rule.percentage
        }));

        const { data, error } = await supabase
            .from('budget_rules')
            .upsert(mapToSnakeCase(rulesToUpsert), { onConflict: 'user_id, category_id' })
            .select();

        if (error) {
            console.error('Error saving budget rules:', error);
            throw error;
        }

        return mapToCamelCase(data);
    } catch (error) {
        console.error('Unexpected error in saveBudgetRules:', error);
        throw error;
    }
};

// Xóa quy tắc ngân quỹ (nếu percentage = 0 hoặc user muốn bỏ)
export const deleteBudgetRule = async (userId, categoryId) => {
    try {
        const { error } = await supabase
            .from('budget_rules')
            .delete()
            .match({ user_id: userId, category_id: categoryId });

        if (error) {
            console.error('Error deleting budget rule:', error);
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error in deleteBudgetRule:', error);
        throw error;
    }
};

// Subscription
export const subscribeBudgetRules = (userId, callback) => {
    return createSubscription('budget_rules', userId, callback);
};
