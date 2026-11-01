import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyDisciplineHeader from '../components/daily-discipline/DailyDisciplineHeader';
import MonthlySummaryCard from '../components/daily-discipline/MonthlySummaryCard';

describe('DailyDisciplineHeader component', () => {
    it('renders with default props and shows title and limit', () => {
        const html = renderToString(
            <DailyDisciplineHeader
                selectedMonth="2026-11"
                dailyLimit={150000}
                onSelectMonth={() => {}}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Lịch Kỷ Luật Chi Tiêu');
        expect(html).toContain('Tháng 11/2026');
        expect(html).toContain('Mục tiêu:');
        expect(html).toContain('150.000');
    });

    it('renders "Hôm nay" jump button when viewing non-current month', () => {
        const html = renderToString(
            <DailyDisciplineHeader
                selectedMonth="2025-01"
                dailyLimit={200000}
                onSelectMonth={() => {}}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Hôm nay');
        expect(html).toContain('Tháng 01/2025');
    });
});

describe('MonthlySummaryCard component', () => {
    const mockSummary = {
        isPastMonth: false,
        isCurrentMonth: true,
        isFutureMonth: false,
        totalDaysInMonth: 30,
        elapsedDays: 10,
        remainingDays: 20,
        passCount: 8,
        failCount: 2,
        successRate: 80,
        mtdExpected: 1500000,
        mtdActualSpent: 1200000,
        diff: 300000,
        totalMonthBudget: 4500000,
        remainingBudget: 3300000,
        dailySuggested: 165000
    };

    it('renders KPI stats, progress, and remaining allowance', () => {
        const html = renderToString(
            <MonthlySummaryCard
                summary={mockSummary}
                isSetupRequired={false}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('8'); // pass count
        expect(html).toContain('2'); // fail count
        expect(html).toContain('80%'); // success rate
        expect(html).toContain('Đang tiết kiệm hơn kỳ vọng: +');
        expect(html).toContain('Ngân sách còn lại:');
        expect(html).toContain('Còn lại');
        expect(html).toContain('20 ngày');
    });

    it('renders setup banner when isSetupRequired is true', () => {
        const html = renderToString(
            <MonthlySummaryCard
                summary={mockSummary}
                isSetupRequired={true}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Chưa thiết lập danh mục kỷ luật');
        expect(html).toContain('Bạn chưa chọn danh mục chi tiêu áp dụng cho Kỷ luật ngày');
        expect(html).toContain('Thiết lập ngay');
    });

    it('displays over-budget warning when diff is negative', () => {
        const overBudgetSummary = {
            ...mockSummary,
            mtdActualSpent: 1800000,
            diff: -300000
        };

        const html = renderToString(
            <MonthlySummaryCard
                summary={overBudgetSummary}
                isSetupRequired={false}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Đang vượt quá kỳ vọng: -');
    });

    it('handles future month state gracefully', () => {
        const futureSummary = {
            isPastMonth: false,
            isCurrentMonth: false,
            isFutureMonth: true,
            totalDaysInMonth: 31,
            elapsedDays: 0,
            remainingDays: 31,
            passCount: 0,
            failCount: 0,
            successRate: 0,
            mtdExpected: 0,
            mtdActualSpent: 0,
            diff: 0,
            totalMonthBudget: 4650000,
            remainingBudget: 4650000,
            dailySuggested: 150000
        };

        const html = renderToString(
            <MonthlySummaryCard
                summary={futureSummary}
                isSetupRequired={false}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Chưa bắt đầu');
        expect(html).toContain('Tháng chưa bắt đầu');
    });

    it('handles month concluded state when remainingDays is 0', () => {
        const pastSummary = {
            isPastMonth: true,
            isCurrentMonth: false,
            isFutureMonth: false,
            totalDaysInMonth: 30,
            elapsedDays: 30,
            remainingDays: 0,
            passCount: 25,
            failCount: 5,
            successRate: 83,
            mtdExpected: 4500000,
            mtdActualSpent: 4200000,
            diff: 300000,
            totalMonthBudget: 4500000,
            remainingBudget: 300000,
            dailySuggested: 0
        };

        const html = renderToString(
            <MonthlySummaryCard
                summary={pastSummary}
                isSetupRequired={false}
                onOpenConfig={() => {}}
            />
        );

        expect(html).toContain('Tháng này đã kết thúc.');
    });
});
