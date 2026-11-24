import { describe, it, expect } from 'vitest';

describe('Transaction Time Parsing and Formatting', () => {
    // Helper replicating the time resolution logic used across TransactionModal, TransferFundsModal, and subscribeTransactions
    const resolveTransactionTime = (txn) => {
        let time = txn.time;
        if (!time) {
            if (txn.date && txn.date.includes('T')) {
                const d = new Date(txn.date);
                const isUtcMidnight = (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
                if (!isUtcMidnight) {
                    time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            }
            if (!time && (txn.createdAt || txn.created_at)) {
                time = new Date(txn.createdAt || txn.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
        }
        return time || null;
    };

    const combineDateAndTime = (dateStr, timeStr) => {
        if (!dateStr) return new Date().toISOString();
        if (dateStr.includes('T')) return dateStr;
        try {
            const d = new Date();
            const [year, month, day] = dateStr.split('-');
            const [hours, minutes] = timeStr.split(':');
            d.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
            d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return d.toISOString();
        } catch {
            return new Date().toISOString();
        }
    };

    it('should NOT default to 07:00 when date is UTC midnight, but should follow createdAt (e.g. 11:35)', () => {
        // In UTC+7, 04:35 UTC is 11:35 local time
        const createdAt = '2026-11-24T04:35:00.000Z';
        const expectedLocalTime = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

        const txn = {
            id: 'txn-1',
            date: '2026-11-24T00:00:00+00:00', // UTC midnight from Postgres date column
            createdAt: createdAt,
            amount: 63000,
            note: 'Cafe'
        };

        const resolvedTime = resolveTransactionTime(txn);
        expect(resolvedTime).toBe(expectedLocalTime);
        expect(resolvedTime).not.toBe('07:00');
    });

    it('should respect explicitly stored txn.time if present', () => {
        const txn = {
            id: 'txn-2',
            date: '2026-11-24T00:00:00+00:00',
            createdAt: '2026-11-24T04:35:00.000Z',
            time: '11:35'
        };

        const resolvedTime = resolveTransactionTime(txn);
        expect(resolvedTime).toBe('11:35');
    });

    it('should use non-midnight date time if user explicitly picked a specific time', () => {
        // Say user created/updated a transaction at 15:30 local time
        const d = new Date();
        d.setHours(15, 30, 0, 0);
        const isoString = d.toISOString();

        const txn = {
            id: 'txn-3',
            date: isoString,
            createdAt: '2026-11-24T04:35:00.000Z'
        };

        const resolvedTime = resolveTransactionTime(txn);
        expect(resolvedTime).toBe('15:30');
    });

    it('combineDateAndTime properly sets hours and minutes into ISO string', () => {
        const iso = combineDateAndTime('2026-11-24', '11:35');
        const parsed = new Date(iso);
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(10); // 0-indexed November
        expect(parsed.getDate()).toBe(24);
        expect(parsed.getHours()).toBe(11);
        expect(parsed.getMinutes()).toBe(35);
    });
});
