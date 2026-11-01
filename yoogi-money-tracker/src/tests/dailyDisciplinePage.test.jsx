import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyDisciplinePage from '../pages/DailyDisciplinePage';

describe('DailyDisciplinePage', () => {
    const mockCategories = [
        {
            id: 'cat-food',
            name: 'Ăn uống',
            type: 'expense',
            icon: '🍜',
            subcategories: [
                { id: 'sub-cafe', name: 'Cà phê', icon: '☕' }
            ]
        }
    ];

    const mockWallets = [
        { id: 'w-cash', name: 'Tiền mặt', isDefault: true }
    ];

    const mockTransactions = [
        {
            id: 'tx-1',
            type: 'expense',
            amount: 50000,
            date: '2026-11-01',
            categoryId: 'cat-food',
            walletId: 'w-cash'
        }
    ];

    const mockDailyBudgetSettings = {
        enabled: true,
        daily_limit: 150000,
        category_ids: ['cat-food'],
        wallet_ids: []
    };

    it('renders page layout with header, summary card, and calendar', () => {
        const html = renderToString(
            <DailyDisciplinePage
                user={{ uid: 'user-1' }}
                transactions={mockTransactions}
                categories={mockCategories}
                wallets={mockWallets}
                dailyBudgetSettings={mockDailyBudgetSettings}
                onSaveSettings={vi.fn()}
                onOpenAddTransaction={vi.fn()}
                onEditTransaction={vi.fn()}
                onDeleteTransaction={vi.fn()}
            />
        );

        // Header elements
        expect(html).toContain('Kỷ Luật Chi Tiêu');
        expect(html).toContain('150.000');
        // Summary & Calendar elements
        expect(html).toContain('Tỷ lệ kỷ luật');
        expect(html).toContain('T2');
        expect(html).toContain('CN');
        expect(html).toContain('Đạt mục tiêu');
    });

    it('renders with unconfigured settings warning when no categories selected', () => {
        const unconfiguredSettings = {
            enabled: true,
            daily_limit: 150000,
            category_ids: [],
            wallet_ids: []
        };

        const html = renderToString(
            <DailyDisciplinePage
                user={{ uid: 'user-1' }}
                transactions={mockTransactions}
                categories={mockCategories}
                wallets={mockWallets}
                dailyBudgetSettings={unconfiguredSettings}
                onSaveSettings={vi.fn()}
            />
        );

        expect(html).toContain('Chưa thiết lập danh mục kỷ luật');
        expect(html).toContain('Thiết lập ngay');
    });
});
