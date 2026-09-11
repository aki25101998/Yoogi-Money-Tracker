import { describe, it, expect, vi } from 'vitest';
import { calculateItemStats, getInstallmentSummaryForMonth } from '../src/utils/calculations';
import { isExpenseTransaction, getInstallmentPaymentMonth } from '../src/utils/transactionUtils';
import { useDashboardStats } from '../src/hooks/useDashboardStats';

// Mock useMemo to just run the function synchronously for testing without React
vi.mock('react', () => ({
    useMemo: (fn) => fn(),
    useState: (val) => [val, () => {}]
}));

describe('Installment Logic Tests (Phase 1)', () => {

    const baseInstallment = {
        id: 'inst-1',
        name: 'iPhone',
        totalPayable: 10000000,
        term: 5,
        monthlyPayment: 2000000,
        startDate: '2026-06-01',
        paidMonths: [],
        partialPayments: {}
    };

    it('Case A: No payment', () => {
        const stats = calculateItemStats(baseInstallment, new Date('2026-08-20'), []);
        expect(stats.paidAmount).toBe(0);
        expect(stats.remainingAmount).toBe(10000000);
    });

    it('Case B: 1 month fully paid via paidMonths', () => {
        const item = { ...baseInstallment, paidMonths: ['2026-06'] };
        const stats = calculateItemStats(item, new Date('2026-08-20'), []);
        expect(stats.paidAmount).toBe(2000000);
        expect(stats.remainingAmount).toBe(8000000);
    });

    it('Case C: Partial payment via transaction', () => {
        const txns = [
            { id: 't1', type: 'installment_repaid', amount: 300000, installmentId: 'inst-1', date: '2026-06-15T00:00:00Z' }
        ];
        const stats = calculateItemStats(baseInstallment, new Date('2026-08-20'), txns);
        expect(stats.paidAmount).toBe(300000);
        expect(stats.remainingAmount).toBe(9700000);
    });

    it('Case D: Multiple partial transactions for the same month', () => {
        const txns = [
            { id: 't1', type: 'installment_repaid', amount: 300000, installmentId: 'inst-1', date: '2026-06-15T00:00:00Z' },
            { id: 't2', type: 'installment_repaid', amount: 200000, installmentId: 'inst-1', date: '2026-06-20T00:00:00Z' }
        ];
        const stats = calculateItemStats(baseInstallment, new Date('2026-08-20'), txns);
        expect(stats.paidAmount).toBe(500000);
        expect(stats.remainingAmount).toBe(9500000);
    });

    it('Case E: paidMonths + transaction in same month - NO double count', () => {
        const item = { ...baseInstallment, paidMonths: ['2026-06'] };
        const txns = [
            // Transaction belongs to the month that is already fully paid
            { id: 't1', type: 'installment_repaid', amount: 2000000, installmentId: 'inst-1', date: '2026-06-15T00:00:00Z' }
        ];
        const stats = calculateItemStats(item, new Date('2026-08-20'), txns);
        // It should just be 2,000,000, not 4,000,000
        expect(stats.paidAmount).toBe(2000000);
        expect(stats.remainingAmount).toBe(8000000);
    });

    it('Case F: Transaction for different installment doesnt affect current one', () => {
        const txns = [
            { id: 't1', type: 'installment_repaid', amount: 500000, installmentId: 'inst-2', date: '2026-06-15T00:00:00Z' }
        ];
        const stats = calculateItemStats(baseInstallment, new Date('2026-08-20'), txns);
        expect(stats.paidAmount).toBe(0);
        expect(stats.remainingAmount).toBe(10000000);
    });

    it('Case G: Legacy transaction handling without installmentId', () => {
        const txns = [
            { id: 't1', type: 'installment_repaid', amount: 700000, description: 'Trả lẻ trả góp iPhone: T06/2026', date: '2026-06-15T00:00:00Z' }
        ];
        const stats = calculateItemStats(baseInstallment, new Date('2026-08-20'), txns);
        expect(stats.paidAmount).toBe(700000);
    });

    it('Case H: Installment exceeds term limits math bounds', () => {
        const item = { ...baseInstallment, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] }; // 6 months, term is 5
        const stats = calculateItemStats(item, new Date('2026-12-01'), []);
        // should bound to totalPayable
        expect(stats.paidAmount).toBe(10000000); 
        expect(stats.remainingAmount).toBe(0);
        expect(stats.isFinished).toBe(true);
    });

    it('Test: getInstallmentPaymentMonth correctly identifies month', () => {
        const txn1 = { date: '2026-08-15T00:00:00Z' };
        const txn2 = { description: 'Trả góp iPhone (T08/2026)' };
        const txn3 = { description: 'Trả góp (T08)', date: '2026-05-15T00:00:00Z' };
        
        expect(getInstallmentPaymentMonth(txn1)).toBe('2026-08');
        expect(getInstallmentPaymentMonth(txn2)).toBe('2026-08');
        expect(getInstallmentPaymentMonth(txn3)).toBe('2026-08');
    });

    it('Test: Monthly Filter getInstallmentSummaryForMonth', () => {
        const transactions = [
            { type: 'installment_repaid', amount: 2000000, date: '2026-07-15' },
            { type: 'installment_repaid', amount: 3000000, date: '2026-08-15', installmentId: 'inst-1' },
            { type: 'installment_repaid', amount: 4000000, date: '2026-09-15' }
        ];
        
        const summary = getInstallmentSummaryForMonth(transactions, 2026, 8);
        expect(summary.total).toBe(3000000);
        expect(summary.byInstallment[0].installmentId).toBe('inst-1');
    });

    it('Test: Dashboard Stats - Wallet Filter', () => {
        const transactions = [
            { type: 'installment_repaid', amount: 2000000, walletId: 'walletA', date: '2026-08-15' },
            { type: 'installment_repaid', amount: 3000000, walletId: 'walletB', date: '2026-08-16' }
        ];
        const wallets = [{ id: 'walletA', initialBalance: 5000000 }, { id: 'walletB', initialBalance: 5000000 }];

        const statsA = useDashboardStats({
            transactions, localWallets: wallets, selectedWalletIds: ['walletA'],
            dateRange: {}, categories: []
        });

        expect(statsA.summaryStats.expense).toBe(2000000);
        expect(statsA.totalBalance).toBe(3000000); // Only wallet A's payment
    });

    it('Test: Transfer must not become Expense', () => {
        const txn = { type: 'transfer', amount: 1000000 };
        expect(isExpenseTransaction(txn)).toBe(false);
    });

    it('Test: Dashboard Stats - No Double Counting', () => {
        const transactions = [
            { type: 'installment_repaid', amount: 2000000, date: '2026-08-15' }
        ];
        const stats = useDashboardStats({ transactions, localWallets: [], selectedWalletIds: [], dateRange: {}, categories: [] });
        
        expect(stats.summaryStats.ordinaryExpense).toBe(0);
        expect(stats.summaryStats.installmentExpense).toBe(2000000);
        expect(stats.summaryStats.expense).toBe(2000000); // 0 + 2000000
    });
});

