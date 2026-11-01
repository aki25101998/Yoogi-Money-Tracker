import { describe, it, expect } from 'vitest';
import { calculateDailyDiscipline, getLocalDateStr } from '../hooks/useDailyDiscipline';

describe('calculateDailyDiscipline logic', () => {
    const config = {
        enabled: true,
        daily_limit: 150000,
        category_ids: ['cat_food', 'cat_cafe'],
        wallet_ids: []
    };

    const sampleTransactions = [
        // Day 1: 120k in tracked categories -> Pass (test ISO string format)
        { id: '1', date: '2026-11-01T07:30:00.000Z', amount: 80000, type: 'expense', categoryId: 'cat_food' },
        { id: '2', date: '2026-11-01T12:00:00.000Z', amount: 40000, type: 'expense', categoryId: 'cat_cafe' },
        // Day 1: 1.5M electricity bill -> Ignored
        { id: '3', date: '2026-11-01T14:00:00.000Z', amount: 1500000, type: 'expense', categoryId: 'cat_bills' },
        // Day 2: 195k in food -> Fail (over by 45k)
        { id: '4', date: '2026-11-02T08:00:00.000Z', amount: 195000, type: 'expense', categoryId: 'cat_food' },
        // Day 3: 0 spend in food/cafe -> No spend (Star)
    ];

    it('correctly filters tracked categories and ignores untracked expenses', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config,
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10' // Day 10 of current month
        });

        const day1 = result.calendarDays.find(d => d.dateStr === '2026-11-01');
        const day2 = result.calendarDays.find(d => d.dateStr === '2026-11-02');
        const day3 = result.calendarDays.find(d => d.dateStr === '2026-11-03');

        expect(day1.spent).toBe(120000);
        expect(day1.status).toBe('pass');
        expect(day2.spent).toBe(195000);
        expect(day2.status).toBe('fail');
        expect(day2.overAmount).toBe(45000);
        expect(day3.spent).toBe(0);
        expect(day3.status).toBe('no_spend');
    });

    it('handles future month without division by zero', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config,
            selectedMonth: '2026-12', // Future month
            currentDateStr: '2026-11-10'
        });

        expect(result.summary.isFutureMonth).toBe(true);
        expect(result.summary.successRate).toBe(0);
        expect(result.summary.elapsedDays).toBe(0);
        expect(result.calendarDays.every(d => d.status === 'future')).toBe(true);
    });

    it('identifies unconfigured state when category_ids is empty', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config: { ...config, category_ids: [] },
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10'
        });

        expect(result.isSetupRequired).toBe(true);
    });

    it('correctly extracts local date string from ISO or date string', () => {
        expect(getLocalDateStr('2026-11-01')).toBe('2026-11-01');
    });

    it('filters by wallet_ids if configured', () => {
        const configWithWallet = {
            ...config,
            wallet_ids: ['wallet_1']
        };
        const txs = [
            { id: '1', date: '2026-11-01T07:30:00.000Z', amount: 80000, type: 'expense', categoryId: 'cat_food', walletId: 'wallet_1' },
            { id: '2', date: '2026-11-01T12:00:00.000Z', amount: 40000, type: 'expense', categoryId: 'cat_cafe', walletId: 'wallet_2' },
        ];
        const result = calculateDailyDiscipline({
            transactions: txs,
            categories: [],
            config: configWithWallet,
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10'
        });
        const day1 = result.calendarDays.find(d => d.dateStr === '2026-11-01');
        expect(day1.spent).toBe(80000);
        expect(day1.trackedTransactions.length).toBe(1);
    });

    it('handles subcategoryId matching tracked categories', () => {
        const txs = [
            { id: '1', date: '2026-11-01T07:30:00.000Z', amount: 50000, type: 'expense', categoryId: 'cat_other', subcategoryId: 'cat_food' },
        ];
        const result = calculateDailyDiscipline({
            transactions: txs,
            categories: [],
            config,
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10'
        });
        const day1 = result.calendarDays.find(d => d.dateStr === '2026-11-01');
        expect(day1.spent).toBe(50000);
        expect(day1.status).toBe('pass');
    });

    it('handles past month correctly where elapsedDays is total days in month', () => {
        const result = calculateDailyDiscipline({
            transactions: [
                { id: '1', date: '2026-10-15T07:30:00.000Z', amount: 50000, type: 'expense', categoryId: 'cat_food' },
            ],
            categories: [],
            config,
            selectedMonth: '2026-10',
            currentDateStr: '2026-11-10'
        });
        expect(result.summary.isPastMonth).toBe(true);
        expect(result.summary.elapsedDays).toBe(31);
        expect(result.summary.remainingDays).toBe(0);
        expect(result.calendarDays.length).toBe(31);
        const day15 = result.calendarDays.find(d => d.dateStr === '2026-10-15');
        expect(day15.status).toBe('pass');
    });
});
