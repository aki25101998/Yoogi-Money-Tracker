import { supabase } from '../config/supabase';
import { mapToCamelCase, mapToSnakeCase, createSubscription } from './coreService';

// Bảng Cài đặt (Budget Settings)
export const fetchBudgetSettings = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('budget_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('Error fetching budget settings:', error);
            throw error;
        }

        return data ? mapToCamelCase(data) : { incomeCategoryIds: [] };
    } catch (error) {
        console.error('Unexpected error in fetchBudgetSettings:', error);
        throw error;
    }
};

export const saveBudgetSettings = async (userId, settings) => {
    try {
        const payload = mapToSnakeCase({
            user_id: userId,
            ...settings
        });

        const { data, error } = await supabase
            .from('budget_settings')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving budget settings:', error);
            throw error;
        }

        return mapToCamelCase(data);
    } catch (error) {
        console.error('Unexpected error in saveBudgetSettings:', error);
        throw error;
    }
};

export const subscribeBudgetSettings = (userId, callback) => {
    return createSubscription('budget_settings', userId, (data) => {
        // Because budget_settings is unique per user, data will be an array of 1 element or empty
        callback(data.length > 0 ? data[0] : { incomeCategoryIds: [] });
    });
};


// Bảng Nhóm Ngân Quỹ (Budget Portfolios)
export const fetchBudgetPortfolios = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('budget_portfolios')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching budget portfolios:', error);
            throw error;
        }

        return mapToCamelCase(data);
    } catch (error) {
        console.error('Unexpected error in fetchBudgetPortfolios:', error);
        throw error;
    }
};

export const saveBudgetPortfolio = async (userId, portfolio) => {
    try {
        const payload = mapToSnakeCase({
            ...portfolio,
            user_id: userId
        });
        
        // Remove undefined id for insert
        if (!payload.id) delete payload.id;

        const { data, error } = await supabase
            .from('budget_portfolios')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error saving budget portfolio:', error);
            throw error;
        }

        return mapToCamelCase(data);
    } catch (error) {
        console.error('Unexpected error in saveBudgetPortfolio:', error);
        throw error;
    }
};

export const deleteBudgetPortfolio = async (userId, portfolioId) => {
    try {
        const { error } = await supabase
            .from('budget_portfolios')
            .delete()
            .match({ id: portfolioId, user_id: userId });

        if (error) {
            console.error('Error deleting budget portfolio:', error);
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error in deleteBudgetPortfolio:', error);
        throw error;
    }
};

export const subscribeBudgetPortfolios = (userId, callback) => {
    return createSubscription('budget_portfolios', userId, callback);
};
