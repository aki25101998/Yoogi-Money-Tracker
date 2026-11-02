import { describe, it, expect } from 'vitest';
import { getPageFromLocation, getUrlFromPage, getPageTitle } from '../utils/routes';

describe('routes utility (Path-based with hash fallback)', () => {
    describe('getPageFromLocation', () => {
        it('handles root, empty, and index.html paths', () => {
            expect(getPageFromLocation('/', '')).toBe('dashboard');
            expect(getPageFromLocation('', '')).toBe('dashboard');
            expect(getPageFromLocation('/index.html', '')).toBe('dashboard');
            expect(getPageFromLocation('/unknown-page', '')).toBe('dashboard');
        });

        it('parses valid primary pathname routes without hash', () => {
            expect(getPageFromLocation('/dashboard')).toBe('dashboard');
            expect(getPageFromLocation('/daily-discipline')).toBe('daily-discipline');
            expect(getPageFromLocation('/transactions')).toBe('transactions');
            expect(getPageFromLocation('/installments')).toBe('installments');
            expect(getPageFromLocation('/debts')).toBe('debts');
            expect(getPageFromLocation('/settings')).toBe('settings');
        });

        it('parses sub-settings pathname routes', () => {
            expect(getPageFromLocation('/settings/wallets')).toBe('settings:wallets');
            expect(getPageFromLocation('/settings/categories')).toBe('settings:categories');
            expect(getPageFromLocation('/settings/ai')).toBe('settings:ai');
            expect(getPageFromLocation('/settings/')).toBe('settings');
        });

        it('supports fallback to legacy hash when pathname is root', () => {
            expect(getPageFromLocation('/', '#/transactions')).toBe('transactions');
            expect(getPageFromLocation('/', '#/debts')).toBe('debts');
            expect(getPageFromLocation('/', '#/settings/wallets')).toBe('settings:wallets');
            expect(getPageFromLocation('/index.html', '#/installments')).toBe('installments');
        });
    });

    describe('getUrlFromPage', () => {
        it('generates clean path URL without hash', () => {
            expect(getUrlFromPage('dashboard')).toBe('/dashboard');
            expect(getUrlFromPage('transactions')).toBe('/transactions');
            expect(getUrlFromPage('installments')).toBe('/installments');
            expect(getUrlFromPage('debts')).toBe('/debts');
            expect(getUrlFromPage('daily-discipline')).toBe('/daily-discipline');
            expect(getUrlFromPage('settings')).toBe('/settings');
            expect(getUrlFromPage('')).toBe('/dashboard');
        });

        it('generates clean path URL for settings sub-pages', () => {
            expect(getUrlFromPage('settings:wallets')).toBe('/settings/wallets');
            expect(getUrlFromPage('settings:categories')).toBe('/settings/categories');
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
