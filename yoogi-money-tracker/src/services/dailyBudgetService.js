import { supabase } from '../config/supabase';

const DEFAULT_SETTINGS = {
    enabled: true,
    daily_limit: 150000,
    category_ids: [],
    wallet_ids: []
};

export const fetchDailyBudgetSettings = async (userId, client = supabase) => {
    if (!userId) return DEFAULT_SETTINGS;
    try {
        const { data, error } = await client
            .from('daily_budget_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Lỗi tải daily_budget_settings:', error);
            return DEFAULT_SETTINGS;
        }

        if (!data) return DEFAULT_SETTINGS;

        return {
            enabled: data.enabled ?? true,
            daily_limit: Number(data.daily_limit) || 150000,
            category_ids: Array.isArray(data.category_ids) ? data.category_ids : [],
            wallet_ids: Array.isArray(data.wallet_ids) ? data.wallet_ids : []
        };
    } catch (err) {
        console.error('Lỗi fetchDailyBudgetSettings:', err);
        return DEFAULT_SETTINGS;
    }
};

export const saveDailyBudgetSettings = async (userId, settings, client = supabase) => {
    if (!userId) throw new Error('Yêu cầu userId để lưu cấu hình');
    const payload = {
        user_id: userId,
        enabled: settings.enabled ?? true,
        daily_limit: Number(settings.daily_limit) || 150000,
        category_ids: Array.isArray(settings.category_ids) ? settings.category_ids : [],
        wallet_ids: Array.isArray(settings.wallet_ids) ? settings.wallet_ids : [],
        updated_at: new Date().toISOString()
    };

    const { error } = await client
        .from('daily_budget_settings')
        .upsert(payload);

    if (error) throw error;

    // Trigger auto-backup mutation event (Yoogi Constitution 07)
    if (typeof window !== 'undefined') {
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
                    onUpdate({
                        enabled: payload.new.enabled ?? true,
                        daily_limit: Number(payload.new.daily_limit) || 150000,
                        category_ids: Array.isArray(payload.new.category_ids) ? payload.new.category_ids : [],
                        wallet_ids: Array.isArray(payload.new.wallet_ids) ? payload.new.wallet_ids : []
                    });
                }
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
};
