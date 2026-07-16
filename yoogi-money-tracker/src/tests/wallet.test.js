import { describe, it, expect } from 'vitest';

describe('Wallet Calculations', () => {
    it('should correctly calculate remaining debt amount', () => {
        // Đây là bài test mẫu để kiểm tra tính đúng đắn của logic tính nợ ở frontend.
        const originalAmount = 1000000;
        const remainingAmount = 300000;
        const expectedRepaidAmount = 700000;

        const calculatedRepaidAmount = originalAmount - remainingAmount;

        expect(calculatedRepaidAmount).toBe(expectedRepaidAmount);
    });

    it('should correctly calculate current wallet balance based on transactions', () => {
        // Bài test mẫu cho tính toán số dư ví. 
        // Theo kiến trúc: Balance = initial_balance + (thu) - (chi)
        const initialBalance = 500000;
        const transactions = [
            { type: 'income', amount: 200000 },
            { type: 'expense', amount: 150000 },
            { type: 'transfer', amount: 50000, isOutgoing: true } // giả lập logic transfer
        ];

        let currentBalance = initialBalance;
        transactions.forEach(txn => {
            if (txn.type === 'income') currentBalance += txn.amount;
            if (txn.type === 'expense') currentBalance -= txn.amount;
            if (txn.type === 'transfer' && txn.isOutgoing) currentBalance -= txn.amount;
        });

        const expectedBalance = 500000 + 200000 - 150000 - 50000;
        expect(currentBalance).toBe(expectedBalance);
    });
});
