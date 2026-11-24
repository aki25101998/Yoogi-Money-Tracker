import { describe, it, expect } from 'vitest';
import { 
    isTransactionForInstallment, 
    getPartialPaymentForMonth, 
    calculateItemStats, 
    calculateWrapperMonthlyRemaining,
    calculateMonthlyDueForItems 
} from '../utils/calculations';
import { isTxnInPortfolio } from '../components/dashboard/BudgetProgressWidget';
import { isExpenseTransaction, isIncomeTransaction } from '../utils/transactionUtils';

describe('Financial Calculations Audit Tests', () => {
    describe('Installment calculation fixes', () => {
        const item1 = {
            id: 'inst-1',
            name: 'Macbook Pro',
            owner: 'Tôi',
            monthlyPayment: 2000000,
            totalPayable: 24000000,
            term: 12,
            startDate: '2026-01-01',
            paidMonths: ['2026-01', '2026-02'],
            partialPayments: {
                '2026-03': 1500000
            }
        };

        const itemFriend = {
            id: 'inst-2',
            name: 'iPhone 15 Cho Bạn',
            owner: 'Bạn A',
            monthlyPayment: 1000000,
            totalPayable: 12000000,
            term: 12,
            startDate: '2026-01-01',
            paidMonths: [],
            partialPayments: {}
        };

        it('recognizes installment payments for owner === "Tôi" (installment_repaid)', () => {
            const txn = {
                type: 'installment_repaid',
                installmentId: 'inst-1',
                amount: 500000,
                date: '2026-03-15'
            };
            expect(isTransactionForInstallment(txn, item1)).toBe(true);
        });

        it('recognizes installment payments when owner !== "Tôi" (loan_repaid with installment_id)', () => {
            const txn = {
                type: 'loan_repaid',
                installmentId: 'inst-2',
                amount: 500000,
                date: '2026-01-15'
            };
            expect(isTransactionForInstallment(txn, itemFriend)).toBe(true);

            const txnSnakeCase = {
                type: 'loan_repaid',
                installment_id: 'inst-2',
                amount: 500000,
                date: '2026-01-15'
            };
            expect(isTransactionForInstallment(txnSnakeCase, itemFriend)).toBe(true);
        });

        it('does not confuse regular debt repayment with installment repayment', () => {
            const debtTxn = {
                type: 'loan_repaid',
                debtId: 'debt-99',
                amount: 500000,
                date: '2026-01-15'
            };
            expect(isTransactionForInstallment(debtTxn, itemFriend)).toBe(false);
        });

        it('getPartialPaymentForMonth returns transaction sum or fallbacks to partialPayments', () => {
            // Case 1: Has matching transactions
            const txns = [
                { type: 'installment_repaid', installmentId: 'inst-1', amount: 800000, date: '2026-03-10' },
                { type: 'installment_repaid', installmentId: 'inst-1', amount: 700000, date: '2026-03-20' }
            ];
            expect(getPartialPaymentForMonth(item1, '2026-03', txns)).toBe(1500000);

            // Case 2: No transactions provided (e.g. from DB item partialPayments cache)
            expect(getPartialPaymentForMonth(item1, '2026-03', [])).toBe(1500000);
            expect(getPartialPaymentForMonth(item1, '2026-03', null)).toBe(1500000);
        });

        it('calculateWrapperMonthlyRemaining accurately subtracts partial payments from monthly due', () => {
            const wrapper = {
                item: item1,
                monthStr: '2026-03'
            };
            // 2,000,000 - 1,500,000 = 500,000
            expect(calculateWrapperMonthlyRemaining(wrapper, [])).toBe(500000);
        });

        it('calculateItemStats correctly combines paidMonths and partialPayments', () => {
            const stats = calculateItemStats(item1, new Date('2026-03-31'), []);
            // 2 paid months * 2,000,000 = 4,000,000 + 1,500,000 partial = 5,500,000
            expect(stats.paidAmount).toBe(5500000);
            expect(stats.remainingAmount).toBe(24000000 - 5500000);
        });
    });

    describe('Budget & Portfolio calculations', () => {
        const portfolio = {
            id: 'p-daily',
            name: 'Chi tiêu thiết yếu',
            percentage: 50,
            expenseCategoryIds: ['cat-personal'] // Only parent category configured
        };

        const portfolioWithSub = {
            id: 'p-cafe',
            name: 'Cà phê & Ăn ngoài',
            percentage: 10,
            expenseCategoryIds: ['sub-cafe'] // Subcategory configured
        };

        const txParent = {
            type: 'expense',
            categoryId: 'cat-personal',
            amount: 100000
        };

        const txWithSub = {
            type: 'expense',
            categoryId: 'cat-personal',
            subcategoryId: 'sub-cafe',
            amount: 63000
        };

        const txOther = {
            type: 'expense',
            categoryId: 'cat-bills',
            amount: 200000
        };

        it('matches transaction with subcategory against parent category portfolio', () => {
            expect(isTxnInPortfolio(txWithSub, portfolio)).toBe(true);
        });

        it('matches transaction with subcategory against subcategory portfolio', () => {
            expect(isTxnInPortfolio(txWithSub, portfolioWithSub)).toBe(true);
        });

        it('matches transaction without subcategory against parent category portfolio', () => {
            expect(isTxnInPortfolio(txParent, portfolio)).toBe(true);
            expect(isTxnInPortfolio(txParent, portfolioWithSub)).toBe(false);
        });

        it('rejects unrelated category transactions', () => {
            expect(isTxnInPortfolio(txOther, portfolio)).toBe(false);
            expect(isTxnInPortfolio(txOther, portfolioWithSub)).toBe(false);
        });

        it('includes installment_repaid in expense transactions', () => {
            const installmentTx = {
                type: 'installment_repaid',
                categoryId: 'cat-personal',
                amount: 2000000
            };
            expect(isExpenseTransaction(installmentTx)).toBe(true);
            expect(isTxnInPortfolio(installmentTx, portfolio)).toBe(true);
        });
    });
});
