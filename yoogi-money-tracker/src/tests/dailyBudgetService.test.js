import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    fetchDailyBudgetSettings,
    saveDailyBudgetSettings,
    subscribeDailyBudgetSettings,
    getDefaultDailyBudgetSettings
} from '../services/dailyBudgetService';

describe('dailyBudgetService', () => {
    afterEach(() => {
        delete globalThis.window;
        delete globalThis.CustomEvent;
        vi.restoreAllMocks();
    });

    describe('getDefaultDailyBudgetSettings', () => {
        it('returns independent default objects on each invocation', () => {
            const first = getDefaultDailyBudgetSettings();
            first.category_ids.push('mutated');
            first.wallet_ids.push('mutated_wallet');
            first.daily_limit = 999999;
            first.enabled = false;

            const second = getDefaultDailyBudgetSettings();
            expect(second.daily_limit).toBe(150000);
            expect(second.enabled).toBe(true);
            expect(second.category_ids).toEqual([]);
            expect(second.wallet_ids).toEqual([]);
        });
    });

    describe('fetchDailyBudgetSettings', () => {
        it('returns default fallback settings if no record found', async () => {
            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: null, error: null })
                        })
                    })
                })
            };
            const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
            expect(settings.daily_limit).toBe(150000);
            expect(settings.enabled).toBe(true);
            expect(settings.category_ids).toEqual([]);
            expect(settings.wallet_ids).toEqual([]);
        });

        it('returns default fallback settings if userId is not provided', async () => {
            const settings = await fetchDailyBudgetSettings(null);
            expect(settings.daily_limit).toBe(150000);
            expect(settings.enabled).toBe(true);
            expect(settings.category_ids).toEqual([]);
            expect(settings.wallet_ids).toEqual([]);
        });

        it('ensures returned default settings are immutable across calls', async () => {
            const first = await fetchDailyBudgetSettings(null);
            first.category_ids.push('cat-polluted');
            first.wallet_ids.push('wal-polluted');
            first.daily_limit = 999999;

            const second = await fetchDailyBudgetSettings(null);
            expect(second.category_ids).toEqual([]);
            expect(second.wallet_ids).toEqual([]);
            expect(second.daily_limit).toBe(150000);
        });

        it('returns parsed settings if record exists with defensive clones', async () => {
            const record = {
                user_id: 'user-123',
                daily_limit: '300000',
                enabled: false,
                category_ids: ['cat-a'],
                wallet_ids: ['wal-b']
            };
            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({
                                data: record,
                                error: null
                            })
                        })
                    })
                })
            };
            const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
            expect(settings.daily_limit).toBe(300000);
            expect(settings.enabled).toBe(false);
            expect(settings.category_ids).toEqual(['cat-a']);
            expect(settings.wallet_ids).toEqual(['wal-b']);

            // Verify defensive clone
            settings.category_ids.push('cat-polluted');
            expect(record.category_ids).toEqual(['cat-a']);
        });

        it('falls back to 150000 if daily_limit is negative or 0', async () => {
            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({
                                data: {
                                    daily_limit: 0,
                                    enabled: true
                                },
                                error: null
                            })
                        })
                    })
                })
            };
            const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
            expect(settings.daily_limit).toBe(150000);
        });

        it('returns cached settings from localStorage when Supabase query errors', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const mockStorage = {
                'yoogi_daily_budget_user-123': JSON.stringify({
                    daily_limit: 250000,
                    enabled: true,
                    category_ids: ['cat-cached'],
                    wallet_ids: []
                })
            };
            globalThis.window = {
                localStorage: {
                    getItem: vi.fn((k) => mockStorage[k] || null),
                    setItem: vi.fn()
                }
            };

            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: null, error: new Error('Table missing') })
                        })
                    })
                })
            };

            const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
            expect(settings.daily_limit).toBe(250000);
            expect(settings.category_ids).toEqual(['cat-cached']);
            consoleSpy.mockRestore();
        });

        it('returns default fallback settings on query error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: null, error: new Error('DB Error') })
                        })
                    })
                })
            };
            const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
            expect(settings.daily_limit).toBe(150000);
            expect(settings.enabled).toBe(true);
            consoleSpy.mockRestore();
        });
    });

    describe('saveDailyBudgetSettings', () => {
        it('throws error when userId is missing', async () => {
            await expect(saveDailyBudgetSettings(null, {}))
                .rejects.toThrow('Yêu cầu userId để lưu cấu hình');
        });

        it('formats save payload correctly with updated_at timestamp', async () => {
            let upsertedData = null;
            const mockSupabase = {
                from: () => ({
                    upsert: (payload) => {
                        upsertedData = payload;
                        return Promise.resolve({ error: null });
                    }
                })
            };
            await saveDailyBudgetSettings('user-123', {
                daily_limit: 200000,
                category_ids: ['cat-1', 'cat-2'],
                wallet_ids: []
            }, mockSupabase);

            expect(upsertedData.user_id).toBe('user-123');
            expect(upsertedData.daily_limit).toBe(200000);
            expect(upsertedData.category_ids).toEqual(['cat-1', 'cat-2']);
            expect(upsertedData.wallet_ids).toEqual([]);
            expect(upsertedData.updated_at).toBeDefined();
        });

        it('handles missing or null settings safely with defaults', async () => {
            let upsertedData = null;
            const mockSupabase = {
                from: () => ({
                    upsert: (payload) => {
                        upsertedData = payload;
                        return Promise.resolve({ error: null });
                    }
                })
            };

            await saveDailyBudgetSettings('user-123', null, mockSupabase);
            expect(upsertedData.daily_limit).toBe(150000);
            expect(upsertedData.enabled).toBe(true);
            expect(upsertedData.category_ids).toEqual([]);
            expect(upsertedData.wallet_ids).toEqual([]);

            await saveDailyBudgetSettings('user-123', undefined, mockSupabase);
            expect(upsertedData.daily_limit).toBe(150000);
            expect(upsertedData.enabled).toBe(true);
            expect(upsertedData.category_ids).toEqual([]);
            expect(upsertedData.wallet_ids).toEqual([]);
        });

        it('falls back to 150000 if daily_limit is negative or 0', async () => {
            let upsertedData = null;
            const mockSupabase = {
                from: () => ({
                    upsert: (payload) => {
                        upsertedData = payload;
                        return Promise.resolve({ error: null });
                    }
                })
            };
            await saveDailyBudgetSettings('user-123', { daily_limit: -50000 }, mockSupabase);
            expect(upsertedData.daily_limit).toBe(150000);
        });

        it('throws error when Supabase upsert fails', async () => {
            const dbError = new Error('Database upsert failed');
            const mockSupabase = {
                from: () => ({
                    upsert: () => Promise.resolve({ error: dbError })
                })
            };
            await expect(saveDailyBudgetSettings('user-123', { daily_limit: 200000 }, mockSupabase))
                .rejects.toThrow('Database upsert failed');
        });

        it('passes onConflict user_id option and caches to localStorage', async () => {
            let capturedOptions = null;
            const mockStorage = {};
            globalThis.window = {
                localStorage: {
                    setItem: vi.fn((k, v) => { mockStorage[k] = v; }),
                    getItem: vi.fn((k) => mockStorage[k] || null)
                }
            };

            const mockSupabase = {
                from: () => ({
                    upsert: (payload, options) => {
                        capturedOptions = options;
                        return Promise.resolve({ error: null });
                    }
                })
            };

            await saveDailyBudgetSettings('user-123', { daily_limit: 180000, category_ids: ['cat-x'] }, mockSupabase);

            expect(capturedOptions).toEqual({ onConflict: 'user_id' });
            expect(mockStorage['yoogi_daily_budget_user-123']).toBeDefined();
            const stored = JSON.parse(mockStorage['yoogi_daily_budget_user-123']);
            expect(stored.daily_limit).toBe(180000);
            expect(stored.category_ids).toEqual(['cat-x']);
        });

        it('dispatches supabase_mutate event if window is defined', async () => {
            const mockDispatch = vi.fn();
            globalThis.window = { dispatchEvent: mockDispatch };
            globalThis.CustomEvent = class {
                constructor(type, options) {
                    this.type = type;
                    this.detail = options?.detail;
                }
            };

            const mockSupabase = {
                from: () => ({
                    upsert: () => Promise.resolve({ error: null })
                })
            };

            await saveDailyBudgetSettings('user-123', { daily_limit: 100000 }, mockSupabase);

            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'supabase_mutate',
                    detail: 'daily_budget_settings'
                })
            );
        });
    });

    describe('subscribeDailyBudgetSettings', () => {
        it('returns noop if userId is not provided', () => {
            const unsub = subscribeDailyBudgetSettings(null, vi.fn());
            expect(typeof unsub).toBe('function');
            expect(() => unsub()).not.toThrow();
        });

        it('sets up realtime subscription and removes channel on unsubscribe', () => {
            let changeHandler = null;
            const mockChannel = {
                on: vi.fn((event, filter, callback) => {
                    changeHandler = callback;
                    return mockChannel;
                }),
                subscribe: vi.fn().mockReturnThis()
            };
            const mockSupabase = {
                channel: vi.fn().mockReturnValue(mockChannel),
                removeChannel: vi.fn()
            };

            const onUpdate = vi.fn();
            const unsub = subscribeDailyBudgetSettings('user-123', onUpdate, mockSupabase);

            expect(mockSupabase.channel).toHaveBeenCalledWith('daily_budget_settings:user-123');
            expect(mockChannel.on).toHaveBeenCalled();
            expect(mockChannel.subscribe).toHaveBeenCalled();

            // Simulate incoming realtime change
            changeHandler({
                new: {
                    daily_limit: 250000,
                    enabled: true,
                    category_ids: ['c1'],
                    wallet_ids: ['w1']
                }
            });

            expect(onUpdate).toHaveBeenCalledWith({
                enabled: true,
                daily_limit: 250000,
                category_ids: ['c1'],
                wallet_ids: ['w1']
            });

            // Unsubscribe
            unsub();
            expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });
    });
});
