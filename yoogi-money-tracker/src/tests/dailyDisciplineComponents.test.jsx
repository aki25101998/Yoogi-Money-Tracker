import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyDisciplineHeader, {
    computePrevMonth,
    computeNextMonth
} from '../components/daily-discipline/DailyDisciplineHeader';
import MonthlySummaryCard from '../components/daily-discipline/MonthlySummaryCard';
import DayCellItem, { formatCompactAmount } from '../components/daily-discipline/DayCellItem';
import DisciplineCalendarGrid from '../components/daily-discipline/DisciplineCalendarGrid';

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

    it('computes next and prev month strings correctly', () => {
        expect(computePrevMonth(2026, 11)).toBe('2026-10');
        expect(computeNextMonth(2026, 11)).toBe('2026-12');
    });

    it('wraps year when computing next month on December or prev month on January', () => {
        expect(computeNextMonth(2026, 12)).toBe('2027-01');
        expect(computePrevMonth(2026, 1)).toBe('2025-12');
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

describe('DayCellItem component', () => {
    it('formats compact amounts correctly', () => {
        expect(formatCompactAmount(0)).toBe('0k');
        expect(formatCompactAmount(120000)).toBe('120k');
        expect(formatCompactAmount(50000)).toBe('50k');
        expect(formatCompactAmount(1000000)).toBe('1M');
        expect(formatCompactAmount(1200000)).toBe('1.2M');
        expect(formatCompactAmount(1250000)).toBe('1.25M');
        expect(formatCompactAmount(500)).toBe('500');
    });

    it('renders pass status with emerald styles and ✓ Đạt badge', () => {
        const dayData = {
            day: 15,
            dateStr: '2026-11-15',
            spent: 120000,
            overAmount: 0,
            status: 'pass'
        };

        const html = renderToString(<DayCellItem dayData={dayData} onSelectDay={() => {}} />);

        expect(html).toContain('15');
        expect(html).toContain('120k');
        expect(html).toContain('✓ Đạt');
        expect(html).toContain('border-emerald-200');
        expect(html).toContain('text-emerald-700');
    });

    it('renders fail status with rose styles and ✕ Vượt badge', () => {
        const dayData = {
            day: 16,
            dateStr: '2026-11-16',
            spent: 250000,
            overAmount: 100000,
            status: 'fail'
        };

        const html = renderToString(<DayCellItem dayData={dayData} onSelectDay={() => {}} />);

        expect(html).toContain('16');
        expect(html).toContain('250k');
        expect(html).toContain('✕ Vượt 100k');
        expect(html).toContain('hidden sm:inline-flex');
        expect(html).toContain('border-rose-200');
        expect(html).toContain('text-rose-700');
    });

    it('renders no_spend status with teal styles and ⭐ Không tiêu badge', () => {
        const dayData = {
            day: 17,
            dateStr: '2026-11-17',
            spent: 0,
            overAmount: 0,
            status: 'no_spend'
        };

        const html = renderToString(<DayCellItem dayData={dayData} onSelectDay={() => {}} />);

        expect(html).toContain('17');
        expect(html).toContain('0k');
        expect(html).toContain('⭐ Không tiêu');
        expect(html).toContain('border-teal-200');
        expect(html).toContain('text-teal-700');
    });

    it('renders future and unconfigured statuses with dashed border and --', () => {
        const futureDay = {
            day: 28,
            dateStr: '2026-11-28',
            spent: 0,
            overAmount: 0,
            status: 'future'
        };

        const htmlFuture = renderToString(<DayCellItem dayData={futureDay} onSelectDay={() => {}} />);
        expect(htmlFuture).toContain('28');
        expect(htmlFuture).toContain('--');
        expect(htmlFuture).toContain('border-dashed');

        const unconfigDay = {
            day: 5,
            dateStr: '2026-11-05',
            spent: 0,
            overAmount: 0,
            status: 'unconfigured'
        };

        const htmlUnconfig = renderToString(<DayCellItem dayData={unconfigDay} onSelectDay={() => {}} />);
        expect(htmlUnconfig).toContain('5');
        expect(htmlUnconfig).toContain('--');
        expect(htmlUnconfig).toContain('border-dashed');
    });

    it('highlights today with ring and Hôm nay indicator', () => {
        const dayData = {
            day: 1,
            dateStr: '2026-11-01',
            spent: 80000,
            overAmount: 0,
            status: 'pass'
        };

        const html = renderToString(<DayCellItem dayData={dayData} isToday={true} onSelectDay={() => {}} />);
        expect(html).toContain('ring-2 ring-blue-500');
        expect(html).toContain('Hôm nay');
    });
});

describe('DisciplineCalendarGrid component', () => {
    it('renders weekday headers with weekend colors', () => {
        const html = renderToString(
            <DisciplineCalendarGrid
                selectedMonth="2026-11"
                calendarDays={[]}
                onSelectDay={() => {}}
            />
        );

        expect(html).toContain('T2');
        expect(html).toContain('T3');
        expect(html).toContain('T4');
        expect(html).toContain('T5');
        expect(html).toContain('T6');
        expect(html).toContain('T7');
        expect(html).toContain('CN');
        expect(html).toContain('text-amber-600'); // T7
        expect(html).toContain('text-rose-600');  // CN
    });

    it('renders 6 offset placeholders for 2026-11 (starts on Sunday)', () => {
        const html = renderToString(
            <DisciplineCalendarGrid
                selectedMonth="2026-11"
                calendarDays={[]}
                onSelectDay={() => {}}
            />
        );

        // 6 empty offset divs should exist
        const offsetMatches = html.match(/offset-\d+/g) || [];
        expect(offsetMatches.length).toBe(6);
    });

    it('renders 0 offset placeholders for 2026-06 (starts on Monday)', () => {
        const html = renderToString(
            <DisciplineCalendarGrid
                selectedMonth="2026-06"
                calendarDays={[]}
                onSelectDay={() => {}}
            />
        );

        const offsetMatches = html.match(/offset-\d+/g) || [];
        expect(offsetMatches.length).toBe(0);
    });

    it('renders all calendar days provided', () => {
        const sampleDays = [
            { day: 1, dateStr: '2026-11-01', spent: 100000, overAmount: 0, status: 'pass' },
            { day: 2, dateStr: '2026-11-02', spent: 200000, overAmount: 50000, status: 'fail' }
        ];

        const html = renderToString(
            <DisciplineCalendarGrid
                selectedMonth="2026-11"
                calendarDays={sampleDays}
                onSelectDay={() => {}}
                currentDateStr="2026-11-01"
            />
        );

        expect(html).toContain('100k');
        expect(html).toContain('200k');
        expect(html).toContain('✓ Đạt');
        expect(html).toContain('✕ Vượt 50k');
        expect(html).toContain('Hôm nay');
    });
});

