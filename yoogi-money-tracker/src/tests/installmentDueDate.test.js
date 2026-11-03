import { describe, it, expect } from 'vitest';
import {
    getItemDueDay,
    getInstallmentDueDate,
    getDueStatus,
    getLenderDueInfo
} from '../utils/calculations';

describe('Installment Due Date Calculations', () => {
    describe('getItemDueDay', () => {
        it('extracts day from startDate string YYYY-MM-DD', () => {
            const item = { startDate: '2026-05-15' };
            expect(getItemDueDay(item)).toBe(15);
        });

        it('prefers item.dueDay if set', () => {
            const item = { startDate: '2026-05-15', dueDay: 20 };
            expect(getItemDueDay(item)).toBe(20);
        });

        it('overrides with customDueDay when provided', () => {
            const item = { startDate: '2026-05-15', dueDay: 20 };
            expect(getItemDueDay(item, 25)).toBe(25);
        });

        it('falls back to 1 when startDate is missing or invalid', () => {
            expect(getItemDueDay({})).toBe(1);
            expect(getItemDueDay(null)).toBe(1);
        });
    });

    describe('getInstallmentDueDate', () => {
        it('calculates the date for the specified month', () => {
            const item = { startDate: '2026-03-15' };
            const targetDate = new Date(2026, 10, 1); // November 2026
            const dueDate = getInstallmentDueDate(item, targetDate);
            expect(dueDate.getFullYear()).toBe(2026);
            expect(dueDate.getMonth()).toBe(10);
            expect(dueDate.getDate()).toBe(15);
        });

        it('clamps day to 30 for months with 30 days', () => {
            const item = { startDate: '2026-01-31' };
            const targetDate = new Date(2026, 10, 1); // November (30 days)
            const dueDate = getInstallmentDueDate(item, targetDate);
            expect(dueDate.getDate()).toBe(30);
        });

        it('clamps day to 28 for February in non-leap year', () => {
            const item = { startDate: '2026-01-31' };
            const targetDate = new Date(2026, 1, 1); // February 2026 (28 days)
            const dueDate = getInstallmentDueDate(item, targetDate);
            expect(dueDate.getDate()).toBe(28);
        });
    });

    describe('getDueStatus', () => {
        const today = new Date(2026, 10, 10); // 10 Nov 2026

        it('returns paid status when isPaid is true', () => {
            const dueDate = new Date(2026, 10, 5);
            const status = getDueStatus(dueDate, true, today);
            expect(status.status).toBe('paid');
            expect(status.badgeText).toContain('Đã thanh toán');
        });

        it('returns today status when due date is today', () => {
            const dueDate = new Date(2026, 10, 10);
            const status = getDueStatus(dueDate, false, today);
            expect(status.status).toBe('today');
            expect(status.badgeText).toContain('Hôm nay đến hạn');
        });

        it('returns upcoming status when due date is in the future', () => {
            const dueDate = new Date(2026, 10, 15);
            const status = getDueStatus(dueDate, false, today);
            expect(status.status).toBe('upcoming');
            expect(status.diffDays).toBe(5);
            expect(status.badgeText).toBe('Còn 5 ngày');
        });

        it('returns overdue status when due date is in the past and unpaid', () => {
            const dueDate = new Date(2026, 10, 7);
            const status = getDueStatus(dueDate, false, today);
            expect(status.status).toBe('overdue');
            expect(status.diffDays).toBe(-3);
            expect(status.badgeText).toBe('⚠ Quá hạn 3 ngày');
        });
    });

    describe('getLenderDueInfo', () => {
        const today = new Date(2026, 10, 3); // 03 Nov 2026
        const targetDate = new Date(2026, 10, 1); // Nov 2026

        it('handles lender with no items', () => {
            const group = { lenderName: 'Trống', items: [] };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.status).toBe('none');
            expect(info.displayText).toBe('Chưa có khoản vay');
        });

        it('handles single item with same due day', () => {
            const group = {
                lenderName: 'VP Bank',
                monthlyDue: 1000000,
                status: 'active',
                items: [
                    { name: 'iPhone', startDate: '2026-05-15', paidMonths: [] }
                ]
            };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.dueDay).toBe(15);
            expect(info.dateStr).toBe('15/11/2026');
            expect(info.displayText).toBe('15/11/2026 (Ngày 15 hàng tháng)');
            expect(info.status).toBe('upcoming');
            expect(info.badgeText).toBe('Còn 12 ngày');
        });

        it('handles multiple items with same due day (e.g. TP Bank 7 items)', () => {
            const group = {
                lenderName: 'TP Bank',
                monthlyDue: 5681333,
                status: 'active',
                items: [
                    { name: 'Item 1', startDate: '2026-01-20', paidMonths: [] },
                    { name: 'Item 2', startDate: '2026-03-20', paidMonths: [] },
                    { name: 'Item 3', startDate: '2026-07-20', paidMonths: [] }
                ]
            };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.dueDay).toBe(20);
            expect(info.dateStr).toBe('20/11/2026');
            expect(info.badgeText).toBe('Còn 17 ngày');
        });

        it('handles multiple items with different due days and picks nearest', () => {
            const group = {
                lenderName: 'Digimi',
                monthlyDue: 3000000,
                status: 'active',
                items: [
                    { name: 'Item 1', startDate: '2026-01-25', paidMonths: [] },
                    { name: 'Item 2', startDate: '2026-02-10', paidMonths: [] },
                    { name: 'Item 3', startDate: '2026-03-18', paidMonths: [] }
                ]
            };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.dueDay).toBe(10); // 10 Nov is closest upcoming
            expect(info.dateStr).toBe('10/11/2026');
            expect(info.displayText).toContain('Gần nhất: 10/11/2026');
            expect(info.allDays).toEqual([10, 18, 25]);
            expect(info.badgeText).toBe('Còn 7 ngày');
        });

        it('prioritizes overdue items when multiple different days exist', () => {
            const group = {
                lenderName: 'Multi Bank',
                monthlyDue: 2000000,
                status: 'active',
                items: [
                    { name: 'Overdue Item', startDate: '2026-01-01', paidMonths: [] }, // 01 Nov (past)
                    { name: 'Upcoming Item', startDate: '2026-01-20', paidMonths: [] }  // 20 Nov (future)
                ]
            };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.dueDay).toBe(1);
            expect(info.status).toBe('overdue');
            expect(info.badgeText).toBe('⚠ Quá hạn 2 ngày');
        });

        it('allows custom fixed lender due day override', () => {
            const group = {
                lenderName: 'VP Bank',
                monthlyDue: 1000000,
                status: 'active',
                items: [
                    { name: 'Item 1', startDate: '2026-01-05', paidMonths: [] }
                ]
            };
            // Override with custom due day 25
            const info = getLenderDueInfo(group, targetDate, 25, today);
            expect(info.isCustom).toBe(true);
            expect(info.dueDay).toBe(25);
            expect(info.dateStr).toBe('25/11/2026');
            expect(info.displayText).toBe('25/11/2026 (Ngày 25 hàng tháng)');
            expect(info.badgeText).toBe('Còn 22 ngày');
        });

        it('displays paid status when monthlyDue is 0', () => {
            const group = {
                lenderName: 'VP Bank',
                monthlyDue: 0,
                status: 'active',
                items: [
                    { name: 'Item 1', startDate: '2026-01-15', paidMonths: ['2026-11'] }
                ]
            };
            const info = getLenderDueInfo(group, targetDate, null, today);
            expect(info.status).toBe('paid');
            expect(info.badgeText).toBe('✓ Đã thanh toán');
        });
    });
});
