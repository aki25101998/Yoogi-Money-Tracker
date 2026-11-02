/**
 * Utility for hash-based routing and page titles in Yoogi Money Tracker
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
 * Extracts and normalizes the page identifier from a URL hash string
 * @param {string} [hashStr] - Optional hash string (defaults to window.location.hash)
 * @returns {string} Normalized page id (e.g. 'dashboard', 'transactions', 'settings:wallets')
 */
export function getPageFromHash(hashStr) {
    const raw = typeof hashStr === 'string' 
        ? hashStr 
        : (typeof window !== 'undefined' ? window.location.hash : '');
    
    // Remove leading # and /
    const cleaned = raw.replace(/^#[/]?/, '').trim();
    if (!cleaned) return 'dashboard';

    // Support both settings/tab and settings:tab
    if (cleaned.startsWith('settings/')) {
        const sub = cleaned.replace('settings/', '').trim();
        return sub ? `settings:${sub}` : 'settings';
    }

    const [basePage] = cleaned.split(':');
    if (VALID_PAGES.includes(basePage)) {
        return cleaned;
    }

    return 'dashboard';
}

/**
 * Converts a page identifier to a URL hash
 * @param {string} page - Page id (e.g. 'transactions', 'settings:wallets')
 * @returns {string} Hash string starting with '#/'
 */
export function getHashFromPage(page) {
    if (!page) return '#/dashboard';
    if (page.startsWith('settings:')) {
        const sub = page.split(':')[1];
        return `#/settings/${sub}`;
    }
    return `#/${page}`;
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
