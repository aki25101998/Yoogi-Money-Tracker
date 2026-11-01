import { supabase } from '../config/supabase';

export const getDefaultDailyBudgetSettings = () => ({
    enabled: true,
    daily_limit: 150000,
    category_ids: [],
    wallet_ids: []
});

const getStorageKey = (userId) => `yoogi_daily_budget_${userId}`;

const sanitizeSettings = (data) => {
    if (!data) return getDefaultDailyBudgetSettings();
    const parsedLimit = Number(data.daily_limit);
    return {
        enabled: data.enabled ?? true,
        daily_limit: parsedLimit > 0 ? parsedLimit : 150000,
        category_ids: Array.isArray(data.category_ids) ? [...data.category_ids] : [],
        wallet_ids: Array.isArray(data.wallet_ids) ? [...data.wallet_ids] : []
    };
};

export const fetchDailyBudgetSettings = async (userId, client = supabase) => {
    if (!userId) return getDefaultDailyBudgetSettings();

    // Check localStorage cache first
    let localCache = null;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(getStorageKey(userId));
            if (raw) {
                localCache = sanitizeSettings(JSON.parse(raw));
            }
        } catch (e) {
            console.warn('Lỗi đọc localStorage daily budget:', e);
        }
    }

    try {
        const { data, error } = await client
            .from('daily_budget_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.warn('Lỗi tải daily_budget_settings từ Supabase (dùng cache local nếu có):', error);
            return localCache || getDefaultDailyBudgetSettings();
        }

        if (!data) {
            return localCache || getDefaultDailyBudgetSettings();
        }

        const parsed = sanitizeSettings(data);
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(getStorageKey(userId), JSON.stringify(parsed));
            } catch (e) {
                // Ignore
            }
        }
        return parsed;
    } catch (err) {
        console.warn('Lỗi fetchDailyBudgetSettings:', err);
        return localCache || getDefaultDailyBudgetSettings();
    }
};

export const saveDailyBudgetSettings = async (userId, settings = {}, client = supabase) => {
    if (!userId) throw new Error('Yêu cầu userId để lưu cấu hình');
    const safe = settings || {};
    const parsedLimit = Number(safe.daily_limit);
    const payload = {
        user_id: userId,
        enabled: safe.enabled ?? true,
        daily_limit: parsedLimit > 0 ? parsedLimit : 150000,
        category_ids: Array.isArray(safe.category_ids) ? [...safe.category_ids] : [],
        wallet_ids: Array.isArray(safe.wallet_ids) ? [...safe.wallet_ids] : [],
        updated_at: new Date().toISOString()
    };

    // Always cache in localStorage immediately so settings are never lost
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
        } catch (e) {
            console.warn('Lỗi lưu localStorage daily budget:', e);
        }
    }

    const { error } = await client
        .from('daily_budget_settings')
        .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    // Trigger auto-backup mutation event (Yoogi Constitution 07)
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'daily_budget_settings' }));
    }

    return payload;
};

export const subscribeDailyBudgetSettings = (userId, onUpdate, client = supabase) => {
    if (!userId) return () => {};
    const channel = client
        .channel(`daily_budget_settings:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'daily_budget_settings',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                if (payload.new) {
                    const parsedLimit = Number(payload.new.daily_limit);
                    onUpdate({
                        enabled: payload.new.enabled ?? true,
                        daily_limit: parsedLimit > 0 ? parsedLimit : 150000,
                        category_ids: Array.isArray(payload.new.category_ids) ? [...payload.new.category_ids] : [],
                        wallet_ids: Array.isArray(payload.new.wallet_ids) ? [...payload.new.wallet_ids] : []
                    });
                }
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
};
