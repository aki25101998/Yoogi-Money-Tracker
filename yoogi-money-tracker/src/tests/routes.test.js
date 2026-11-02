import { describe, it, expect } from 'vitest';
import { getPageFromHash, getHashFromPage, getPageTitle } from '../utils/routes';

describe('routes utility', () => {
    describe('getPageFromHash', () => {
        it('handles empty, root, and missing hashes', () => {
            expect(getPageFromHash('')).toBe('dashboard');
            expect(getPageFromHash('#')).toBe('dashboard');
            expect(getPageFromHash('#/')).toBe('dashboard');
            expect(getPageFromHash('#/unknown-page')).toBe('dashboard');
        });

        it('parses valid primary pages', () => {
            expect(getPageFromHash('#/dashboard')).toBe('dashboard');
            expect(getPageFromHash('#dashboard')).toBe('dashboard');
            expect(getPageFromHash('#/daily-discipline')).toBe('daily-discipline');
            expect(getPageFromHash('#/transactions')).toBe('transactions');
            expect(getPageFromHash('#/installments')).toBe('installments');
            expect(getPageFromHash('#/debts')).toBe('debts');
            expect(getPageFromHash('#/settings')).toBe('settings');
        });

        it('parses sub-settings routes formatted as slash or colon', () => {
            expect(getPageFromHash('#/settings/wallets')).toBe('settings:wallets');
            expect(getPageFromHash('#/settings:wallets')).toBe('settings:wallets');
            expect(getPageFromHash('#/settings/categories')).toBe('settings:categories');
            expect(getPageFromHash('#/settings/ai')).toBe('settings:ai');
            expect(getPageFromHash('#/settings/')).toBe('settings');
        });
    });

    describe('getHashFromPage', () => {
        it('generates correct hash for primary pages', () => {
            expect(getHashFromPage('dashboard')).toBe('#/dashboard');
            expect(getHashFromPage('transactions')).toBe('#/transactions');
            expect(getHashFromPage('installments')).toBe('#/installments');
            expect(getHashFromPage('debts')).toBe('#/debts');
            expect(getHashFromPage('')).toBe('#/dashboard');
        });

        it('generates slash-formatted hash for settings sub-pages', () => {
            expect(getHashFromPage('settings')).toBe('#/settings');
            expect(getHashFromPage('settings:wallets')).toBe('#/settings/wallets');
            expect(getHashFromPage('settings:categories')).toBe('#/settings/categories');
        });
    });

    describe('getPageTitle', () => {
        it('returns proper titles for each page', () => {
            expect(getPageTitle('dashboard')).toBe('Tổng quan | Yoogi Money Tracker');
            expect(getPageTitle('daily-discipline')).toBe('Kỷ luật | Yoogi Money Tracker');
            expect(getPageTitle('transactions')).toBe('Giao dịch | Yoogi Money Tracker');
            expect(getPageTitle('installments')).toBe('Trả góp | Yoogi Money Tracker');
            expect(getPageTitle('debts')).toBe('Sổ nợ | Yoogi Money Tracker');
            expect(getPageTitle('settings')).toBe('Cài đặt | Yoogi Money Tracker');
            expect(getPageTitle('settings:wallets')).toBe('Cài đặt ví tiền | Yoogi');
            expect(getPageTitle('settings:categories')).toBe('Cài đặt danh mục | Yoogi');
        });
    });
});
