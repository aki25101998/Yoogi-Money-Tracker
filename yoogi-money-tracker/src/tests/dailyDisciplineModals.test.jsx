import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DayDetailsModal, {
    formatDayTitle,
    getCategoryInfo,
    getWalletName
} from '../components/daily-discipline/DayDetailsModal';
import DailyBudgetConfigModal, {
    toggleSubcategorySelection,
    computeFoodCategoryIds
} from '../components/daily-discipline/DailyBudgetConfigModal';

describe('DayDetailsModal Helpers', () => {
    it('formatDayTitle formats date string into Vietnamese weekday and date format', () => {
        // 2026-11-14 is Saturday -> "Thứ Bảy, 14/11/2026"
        const formatted = formatDayTitle('2026-11-14');
        expect(formatted).toBe('Thứ Bảy, 14/11/2026');

        // 2026-11-01 is Sunday -> "Chủ Nhật, 01/11/2026"
        const sunday = formatDayTitle('2026-11-01');
        expect(sunday).toBe('Chủ Nhật, 01/11/2026');

        // 2026-11-13 is Friday -> "Thứ Sáu, 13/11/2026"
        const friday = formatDayTitle('2026-11-13');
        expect(friday).toBe('Thứ Sáu, 13/11/2026');

        expect(formatDayTitle('')).toBe('');
    });

    it('getCategoryInfo resolves category and subcategory info correctly', () => {
        const mockCategories = [
            {
                id: 'cat-food',
                name: 'Ăn uống',
                icon: '🍜',
                subcategories: [
                    { id: 'sub-cafe', name: 'Cà phê', icon: '☕' },
                    { id: 'sub-lunch', name: 'Cơm trưa', icon: '🍱' }
                ]
            },
            {
                id: 'cat-bill',
                name: 'Hóa đơn',
                icon: '⚡'
            }
        ];

        // Match parent only
        const txn1 = { categoryId: 'cat-food', amount: 50000 };
        const info1 = getCategoryInfo(txn1, mockCategories);
        expect(info1.name).toBe('Ăn uống');
        expect(info1.icon).toBe('🍜');

        // Match subcategory
        const txn2 = { categoryId: 'cat-food', subcategoryId: 'sub-cafe', amount: 35000 };
        const info2 = getCategoryInfo(txn2, mockCategories);
        expect(info2.name).toBe('Cà phê');
        expect(info2.icon).toBe('☕');

        // Fallback when unknown
        const txn3 = { amount: 10000 };
        const info3 = getCategoryInfo(txn3, mockCategories);
        expect(info3.name).toBe('Chi tiêu');
        expect(info3.icon).toBe('💸');
    });

    it('getWalletName resolves wallet name correctly', () => {
        const mockWallets = [
            { id: 'w1', name: 'Ví Tiền Mặt' },
            { id: 'w2', name: 'Tài Khoản MB Bank' }
        ];

        expect(getWalletName({ walletId: 'w1' }, mockWallets)).toBe('Ví Tiền Mặt');
        expect(getWalletName({ wallet_id: 'w2' }, mockWallets)).toBe('Tài Khoản MB Bank');
        expect(getWalletName({ walletId: 'w999' }, mockWallets)).toBe('');
        expect(getWalletName(null, mockWallets)).toBe('');
    });
});

describe('DayDetailsModal Component', () => {
    const mockCategories = [
        {
            id: 'c1',
            name: 'Ăn uống',
            icon: '🍜',
            subcategories: [{ id: 's1', name: 'Cơm trưa', icon: '🍱' }]
        },
        {
            id: 'c2',
            name: 'Điện nước',
            icon: '⚡'
        }
    ];

    const mockWallets = [
        { id: 'w1', name: 'Ví Tiền Mặt' },
        { id: 'w2', name: 'Techcombank' }
    ];

    it('renders null when isOpen is false or dayData is missing', () => {
        const htmlClosed = renderToString(
            <DayDetailsModal
                isOpen={false}
                onClose={() => {}}
                dayData={{ dateStr: '2026-11-14' }}
            />
        );
        expect(htmlClosed).toBe('');

        const htmlNoData = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={null}
            />
        );
        expect(htmlNoData).toBe('');
    });

    it('renders pass status with target met badge and transaction list', () => {
        const dayData = {
            day: 14,
            dateStr: '2026-11-14',
            spent: 90000,
            overAmount: 0,
            status: 'pass',
            trackedTransactions: [
                {
                    id: 't1',
                    amount: 55000,
                    categoryId: 'c1',
                    subcategoryId: 's1',
                    walletId: 'w1',
                    description: 'Cơm sườn bì chả'
                },
                {
                    id: 't2',
                    amount: 35000,
                    categoryId: 'c1',
                    walletId: 'w2',
                    description: 'Trà sữa'
                }
            ],
            otherTransactions: [
                {
                    id: 't3',
                    amount: 500000,
                    categoryId: 'c2',
                    walletId: 'w2',
                    description: 'Tiền điện tháng 11'
                }
            ]
        };

        const html = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={dayData}
                dailyLimit={150000}
                categories={mockCategories}
                wallets={mockWallets}
                onQuickAddTransaction={() => {}}
            />
        );

        // Header and date title
        expect(html).toContain('Thứ Bảy, 14/11/2026');
        expect(html).toContain('Đạt mục tiêu');
        expect(html).toContain('90.000');
        expect(html).toContain('150.000');

        // Quick add button
        expect(html).toContain('+ Thêm chi tiêu');

        // Tracked items section
        expect(html).toContain('Chi tiêu thuộc hạn mức kỷ luật');
        expect(html).toContain('món, tổng:');
        expect(html).toContain('Cơm sườn bì chả');
        expect(html).toContain('Ví Tiền Mặt');
        expect(html).toContain('55.000');
        expect(html).toContain('Trà sữa');
        expect(html).toContain('Techcombank');
        expect(html).toContain('35.000');

        // Other expenses section toggle
        expect(html).toContain('Khoản chi khác ngoài hạn mức trong ngày');
        expect(html).toContain('pointer-events-none">Khoản chi khác ngoài hạn mức trong ngày</span>');
        expect(html).toContain('500.000');
    });

    it('renders fail status with over amount badge', () => {
        const dayData = {
            day: 15,
            dateStr: '2026-11-15',
            spent: 220000,
            overAmount: 70000,
            status: 'fail',
            trackedTransactions: [
                { id: 't4', amount: 220000, categoryId: 'c1', description: 'Tiệc liên hoan' }
            ],
            otherTransactions: []
        };

        const html = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={dayData}
                dailyLimit={150000}
                categories={mockCategories}
                wallets={mockWallets}
            />
        );

        expect(html).toContain('Vượt hạn mức');
        expect(html).toContain('70.000');
        expect(html).toContain('220.000');
    });

    it('renders no_spend status with great job badge', () => {
        const dayData = {
            day: 16,
            dateStr: '2026-11-16',
            spent: 0,
            overAmount: 0,
            status: 'no_spend',
            trackedTransactions: [],
            otherTransactions: []
        };

        const html = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={dayData}
                dailyLimit={150000}
                categories={mockCategories}
                wallets={mockWallets}
            />
        );

        expect(html).toContain('Tuyệt vời - Không tiêu đồng nào (0 đ /');
        expect(html).toContain('Không có khoản chi tiêu nào thuộc danh mục kỷ luật trong ngày này.');
    });

    it('renders future and unconfigured statuses', () => {
        const futureHtml = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={{ dateStr: '2026-11-30', status: 'future', spent: 0, trackedTransactions: [] }}
                dailyLimit={150000}
            />
        );
        expect(futureHtml).toContain('Ngày trong tương lai');

        const unconfHtml = renderToString(
            <DayDetailsModal
                isOpen={true}
                onClose={() => {}}
                dayData={{ dateStr: '2026-11-05', status: 'unconfigured', spent: 0, trackedTransactions: [] }}
                dailyLimit={150000}
            />
        );
        expect(unconfHtml).toContain('Chưa cấu hình danh mục');
    });
});

describe('DailyBudgetConfigModal Component', () => {
    const mockCategories = [
        {
            id: 'cat-eat',
            name: 'Ăn uống',
            icon: '🍜',
            type: 'expense',
            subcategories: [
                { id: 'sub-cafe', name: 'Cà phê sáng', icon: '☕' },
                { id: 'sub-rice', name: 'Cơm văn phòng', icon: '🍚' }
            ]
        },
        {
            id: 'cat-rent',
            name: 'Tiền thuê nhà',
            icon: '🏠',
            type: 'expense'
        },
        {
            id: 'cat-salary',
            name: 'Lương',
            icon: '💰',
            type: 'income'
        }
    ];

    const mockWallets = [
        { id: 'w1', name: 'Ví Tiền Mặt' },
        { id: 'w2', name: 'Vietcombank' }
    ];

    it('renders null when isOpen is false', () => {
        const html = renderToString(
            <DailyBudgetConfigModal
                isOpen={false}
                onClose={() => {}}
                config={{ enabled: true }}
            />
        );
        expect(html).toBe('');
    });

    it('renders form fields when isOpen is true', () => {
        const config = {
            enabled: true,
            daily_limit: 150000,
            category_ids: ['cat-eat'],
            wallet_ids: []
        };

        const html = renderToString(
            <DailyBudgetConfigModal
                isOpen={true}
                onClose={() => {}}
                config={config}
                categories={mockCategories}
                wallets={mockWallets}
                onSaveConfig={() => {}}
            />
        );

        // Header
        expect(html).toContain('Cài Đặt Hạn Mức Kỷ Luật Ngày');

        // Toggle
        expect(html).toContain('Bật tính năng kỷ luật ngày');

        // Limit & chips
        expect(html).toContain('Hạn mức mỗi ngày');
        expect(html).toContain('150.000');
        expect(html).toContain('100k');
        expect(html).toContain('150k');
        expect(html).toContain('200k');
        expect(html).toContain('300k');

        // Food auto-suggest button
        expect(html).toContain('✨ Tự động gợi ý ăn uống');
        expect(html).toContain('Chỉ các khoản chi thuộc danh mục được chọn mới tính vào hạn mức ngày');

        // Expense categories listed, income category excluded
        expect(html).toContain('Ăn uống');
        expect(html).toContain('Tiền thuê nhà');
        expect(html).not.toContain('Lương');

        // Wallets
        expect(html).toContain('Ví áp dụng');
        expect(html).toContain('Tất cả các ví');
        expect(html).toContain('Chọn ví cụ thể');

        // Action buttons
        expect(html).toContain('Hủy');
        expect(html).toContain('Lưu cấu hình');
    });

    it('renders customized settings with specific limit and wallet selection', () => {
        const config = {
            enabled: false,
            daily_limit: 200000,
            category_ids: ['sub-cafe'],
            wallet_ids: ['w1']
        };

        const html = renderToString(
            <DailyBudgetConfigModal
                isOpen={true}
                onClose={() => {}}
                config={config}
                categories={mockCategories}
                wallets={mockWallets}
                onSaveConfig={() => {}}
            />
        );

        expect(html).toContain('Đang tạm dừng tính năng kỷ luật');
        expect(html).toContain('200.000');
        expect(html).toContain('Ví Tiền Mặt');

        // Check mobile scrollability: no nested max-h scroll classes
        expect(html).not.toContain('max-h-60 overflow-y-auto');
        expect(html).not.toContain('max-h-40 overflow-y-auto');
    });

    it('toggleSubcategorySelection handles parent/child hierarchy correctly', () => {
        const parentCat = {
            id: 'parent-1',
            name: 'Ăn uống',
            subcategories: [
                { id: 'sub-1', name: 'Cơm' },
                { id: 'sub-2', name: 'Cà phê' }
            ]
        };

        // 1. Checking sub-1 when sub-2 is not checked -> adds sub-1, does not add parent-1
        let selected = toggleSubcategorySelection([], 'sub-1', parentCat);
        expect(selected).toContain('sub-1');
        expect(selected).not.toContain('parent-1');

        // 2. Checking sub-2 when sub-1 is checked -> now all subcategories are checked, adds parent-1
        selected = toggleSubcategorySelection(selected, 'sub-2', parentCat);
        expect(selected).toContain('sub-1');
        expect(selected).toContain('sub-2');
        expect(selected).toContain('parent-1');

        // 3. Unchecking sub-1 -> removes sub-1 AND removes parent-1
        selected = toggleSubcategorySelection(selected, 'sub-1', parentCat);
        expect(selected).not.toContain('sub-1');
        expect(selected).not.toContain('parent-1');
        expect(selected).toContain('sub-2');
    });

    it('computeFoodCategoryIds matches food keywords selectively', () => {
        const categories = [
            {
                id: 'cat-eat',
                name: 'Ăn uống', // matches food keywords
                subcategories: [
                    { id: 'sub-food-1', name: 'Cơm trưa' },
                    { id: 'sub-food-2', name: 'Trà đá' }
                ]
            },
            {
                id: 'cat-fun',
                name: 'Giải trí', // does not match
                subcategories: [
                    { id: 'sub-cafe', name: 'Cà phê bạn bè' }, // matches 'cà phê'
                    { id: 'sub-cinema', name: 'Xem phim' } // does not match
                ]
            },
            {
                id: 'cat-all-subs-match',
                name: 'Dịch vụ khác', // does not match
                subcategories: [
                    { id: 'sub-food-a', name: 'Ăn vặt' }, // matches
                    { id: 'sub-food-b', name: 'Đi chợ' } // matches
                ]
            }
        ];

        const matched = computeFoodCategoryIds(categories, []);

        // 1. cat-eat matches: adds cat-eat and all its subcategories
        expect(matched).toContain('cat-eat');
        expect(matched).toContain('sub-food-1');
        expect(matched).toContain('sub-food-2');

        // 2. cat-fun: only sub-cafe matches, cinema does not -> adds sub-cafe, does NOT add cat-fun
        expect(matched).toContain('sub-cafe');
        expect(matched).not.toContain('sub-cinema');
        expect(matched).not.toContain('cat-fun');

        // 3. cat-all-subs-match: all subcategories match -> adds all subs and cat-all-subs-match
        expect(matched).toContain('sub-food-a');
        expect(matched).toContain('sub-food-b');
        expect(matched).toContain('cat-all-subs-match');
    });
});
