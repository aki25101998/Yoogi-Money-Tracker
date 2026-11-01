import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchDailyBudgetSettings,
    saveDailyBudgetSettings,
    subscribeDailyBudgetSettings
} from '../services/dailyBudgetService';

describe('dailyBudgetService', () => {
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
        });

        it('returns parsed settings if record exists', async () => {
            const mockSupabase = {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({
                                data: {
                                    user_id: 'user-123',
                                    daily_limit: '300000',
                                    enabled: false,
                                    category_ids: ['cat-a'],
                                    wallet_ids: ['wal-b']
                                },
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

            delete globalThis.window;
            delete globalThis.CustomEvent;
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
