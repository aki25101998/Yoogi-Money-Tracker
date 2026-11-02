/**
 * Utility for URL routing (HTML5 History API path-based & hash fallback) and page titles in Yoogi Money Tracker
 */

export const VALID_PAGES = [
    'dashboard',
    'daily-discipline',
    'transactions',
    'installments',
    'debts',
    'settings'
];

export const SETTINGS_SUBTABS = {
    general: 'Cài đặt chung',
    budgets: 'Cài đặt ngân quỹ',
    wallets: 'Cài đặt ví tiền',
    categories: 'Cài đặt danh mục',
    ai: 'Ví ngữ cảnh AI',
    sync: 'Đồng bộ dữ liệu',
    yoogi_template: 'Mẫu Yoogi'
};

/**
 * Extracts and normalizes the page identifier from a URL path and/or hash string
 * @param {string} [pathname] - Optional pathname (defaults to window.location.pathname)
 * @param {string} [hashStr] - Optional hash string (defaults to window.location.hash)
 * @returns {string} Normalized page id (e.g. 'dashboard', 'transactions', 'settings:wallets')
 */
export function getPageFromLocation(pathname, hashStr) {
    const rawPath = typeof pathname === 'string'
        ? pathname
        : (typeof window !== 'undefined' ? window.location.pathname : '/');

    // Clean leading/trailing slashes
    const cleanedPath = rawPath.replace(/^\/+|\/+$/g, '').trim();

    // 1. Try parsing from pathname first
    if (cleanedPath && cleanedPath !== 'index.html') {
        if (cleanedPath === 'settings') {
            return 'settings';
        }
        if (cleanedPath.startsWith('settings/')) {
            const sub = cleanedPath.replace('settings/', '').trim();
            return sub ? `settings:${sub}` : 'settings';
        }
        const [base] = cleanedPath.split('/');
        if (VALID_PAGES.includes(base)) {
            return base;
        }
    }

    // 2. Fallback to hash if pathname is empty or root (e.g. legacy bookmarks with #/transactions)
    const rawHash = typeof hashStr === 'string'
        ? hashStr
        : (typeof window !== 'undefined' ? window.location.hash : '');

    const cleanedHash = rawHash.replace(/^#[/]?/, '').trim();
    if (cleanedHash) {
        if (cleanedHash.startsWith('settings/')) {
            const sub = cleanedHash.replace('settings/', '').trim();
            return sub ? `settings:${sub}` : 'settings';
        }
        const [baseHash] = cleanedHash.split(':');
        if (VALID_PAGES.includes(baseHash)) {
            return cleanedHash;
        }
    }

    return 'dashboard';
}

/**
 * Converts a page identifier to a clean URL pathname
 * @param {string} page - Page id (e.g. 'transactions', 'settings:wallets')
 * @returns {string} Clean path string (e.g. '/transactions', '/settings/wallets')
 */
export function getUrlFromPage(page) {
    if (!page || page === 'dashboard') return '/dashboard';
    if (page.startsWith('settings:')) {
        const sub = page.split(':')[1];
        return `/settings/${sub}`;
    }
    return `/${page}`;
}

/**
 * Generates human-friendly document title for the browser tab
 * @param {string} page - Page id
 * @returns {string} Formatted title
 */
export function getPageTitle(page) {
    const [base, sub] = (page || 'dashboard').split(':');
    switch (base) {
        case 'dashboard':
            return 'Tổng quan | Yoogi Money Tracker';
        case 'daily-discipline':
            return 'Kỷ luật | Yoogi Money Tracker';
        case 'transactions':
            return 'Giao dịch | Yoogi Money Tracker';
        case 'installments':
            return 'Trả góp | Yoogi Money Tracker';
        case 'debts':
            return 'Sổ nợ | Yoogi Money Tracker';
        case 'settings': {
            if (sub && SETTINGS_SUBTABS[sub]) {
                return `${SETTINGS_SUBTABS[sub]} | Yoogi`;
            }
            return 'Cài đặt | Yoogi Money Tracker';
        }
        default:
            return 'Yoogi Money Tracker';
    }
}
