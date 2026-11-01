import React, { useState, useMemo } from 'react';
import useDailyDiscipline from '../hooks/useDailyDiscipline';
import DailyDisciplineHeader from '../components/daily-discipline/DailyDisciplineHeader';
import MonthlySummaryCard from '../components/daily-discipline/MonthlySummaryCard';
import DisciplineCalendarGrid from '../components/daily-discipline/DisciplineCalendarGrid';
import DayDetailsModal from '../components/daily-discipline/DayDetailsModal';
import DailyBudgetConfigModal from '../components/daily-discipline/DailyBudgetConfigModal';

const getDefaultMonth = () => {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
};

const DailyDisciplinePage = ({
    user,
    transactions = [],
    categories = [],
    wallets = [],
    dailyBudgetSettings,
    onSaveSettings,
    onOpenAddTransaction,
    onEditTransaction,
    onDeleteTransaction
}) => {
    const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth);
    const [selectedDay, setSelectedDay] = useState(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const { isSetupRequired, calendarDays, summary } = useDailyDiscipline({
        transactions,
        categories,
        config: dailyBudgetSettings,
        selectedMonth
    });

    const activeDayData = useMemo(() => {
        if (!selectedDay) return null;
        return calendarDays.find(d => d.dateStr === selectedDay.dateStr) || selectedDay;
    }, [selectedDay, calendarDays]);

    const dailyLimit = dailyBudgetSettings?.daily_limit || 150000;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <DailyDisciplineHeader
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                dailyLimit={dailyLimit}
                onOpenConfig={() => setIsConfigOpen(true)}
            />

            {/* Monthly Summary */}
            <MonthlySummaryCard
                summary={summary}
                isSetupRequired={isSetupRequired}
                onOpenConfig={() => setIsConfigOpen(true)}
            />

            {/* Calendar Grid */}
            <DisciplineCalendarGrid
                selectedMonth={selectedMonth}
                calendarDays={calendarDays}
                onSelectDay={(day) => setSelectedDay(day)}
            />

            {/* Day Details Modal */}
            <DayDetailsModal
                isOpen={Boolean(selectedDay)}
                onClose={() => setSelectedDay(null)}
                dayData={activeDayData}
                dailyLimit={dailyLimit}
                categories={categories}
                wallets={wallets}
                onQuickAddTransaction={(initialData) => {
                    setSelectedDay(null);
                    onOpenAddTransaction?.(initialData);
                }}
                onEditTransaction={(txn) => {
                    setSelectedDay(null);
                    onEditTransaction?.(txn);
                }}
                onDeleteTransaction={onDeleteTransaction}
            />

            {/* Config Modal */}
            <DailyBudgetConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                config={dailyBudgetSettings}
                categories={categories}
                wallets={wallets}
                onSaveConfig={async (newConfig) => {
                    if (onSaveSettings) {
                        await onSaveSettings(newConfig);
                    }
                }}
            />
        </div>
    );
};

export default DailyDisciplinePage;
