import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveUserAppData, loadUserAppData, setCacheItem, getCacheItem } from '../services/offlineStorage';

describe('offlineStorage service', () => {
    beforeEach(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear();
        }
    });

    it('saves and retrieves user app data using fallback if indexedDB is absent', async () => {
        const userId = 'user_test_123';
        const sampleData = {
            wallets: [{ id: 'w1', name: 'Tiền mặt', balance: 500000 }],
            transactions: [{ id: 't1', amount: 50000, type: 'expense' }],
            categories: [{ id: 'c1', name: 'Ăn uống' }]
        };

        await saveUserAppData(userId, sampleData);
        const loaded = await loadUserAppData(userId);

        expect(loaded).toBeDefined();
        expect(loaded.wallets).toHaveLength(1);
        expect(loaded.wallets[0].name).toBe('Tiền mặt');
        expect(loaded.transactions).toHaveLength(1);
        expect(loaded.cachedAt).toBeTypeOf('number');
    });

    it('returns null if no data cached for user', async () => {
        const loaded = await loadUserAppData('non_existent_user');
        expect(loaded).toBeNull();
    });

    it('handles null/undefined gracefully', async () => {
        await saveUserAppData(null, null);
        const res = await loadUserAppData(null);
        expect(res).toBeNull();
    });
});
