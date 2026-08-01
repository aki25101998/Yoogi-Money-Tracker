import React, { useMemo, useState } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import PortfolioTransactionsModal from '../modals/PortfolioTransactionsModal';

const BudgetProgressWidget = ({ transactions, categories, budgetSettings, budgetPortfolios, dateRange, onEditTransaction, onDeleteTransaction }) => {
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);

    // 1. Calculate base income and map expenses
    const { totalIncome, categoryExpenses } = useMemo(() => {
        let income = 0;
        const expenses = {};

        const validIncomeIds = budgetSettings?.incomeCategoryIds || [];
        const validWalletIds = budgetSettings?.walletIds || [];
        const applyWalletFilter = validWalletIds.length > 0;

        transactions.forEach(t => {
            if (applyWalletFilter && !validWalletIds.includes(t.walletId)) return;

            if (t.type === 'income' && validIncomeIds.includes(t.categoryId)) {
                income += Number(t.amount) || 0;
            } else if (t.type === 'expense') {
                const amount = Number(t.amount) || 0;
                const idToTrack = t.subcategoryId || t.categoryId;
                if (idToTrack) {
                    expenses[idToTrack] = (expenses[idToTrack] || 0) + amount;
                }
            }
        });

        return { totalIncome: income, categoryExpenses: expenses };
    }, [transactions, budgetSettings]);

    // 2. Filter active portfolios
    const activePortfolios = useMemo(() => {
        return (budgetPortfolios || []).filter(p => parseFloat(p.percentage) > 0 && p.expenseCategoryIds && p.expenseCategoryIds.length > 0);
    }, [budgetPortfolios]);

    if (!activePortfolios || activePortfolios.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            <div className="flex flex-col gap-1 mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    Ngân quỹ tháng này
                </h3>
                <div className="text-sm text-slate-500 pl-7">
                    Thu nhập cơ sở: <span className="font-bold text-emerald-600">{formatCurrency(totalIncome)}</span>
                </div>
            </div>

            <div className="space-y-5">
                {activePortfolios.map(portfolio => {
                    const percentage = parseFloat(portfolio.percentage) || 0;
                    const budgetAmount = (totalIncome * percentage) / 100;
                    
                    // Sum expenses for all categories in this portfolio
                    const spentAmount = portfolio.expenseCategoryIds.reduce((sum, catId) => sum + (categoryExpenses[catId] || 0), 0);
                    
                    const percentSpent = budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;
                    const isExceeded = spentAmount > budgetAmount && budgetAmount > 0;
                    const isNearLimit = percentSpent >= 80 && !isExceeded;

                    let barColor = 'bg-emerald-500';
                    if (isExceeded) barColor = 'bg-rose-500';
                    else if (isNearLimit) barColor = 'bg-amber-500';

                    // Get unique parent icons for the selected categories
                    const parentIcons = portfolio.expenseCategoryIds.map(id => {
                        let found = categories.find(c => c.id === id);
                        if (found) return found.icon;
                        for (const c of categories) {
                            if (c.subcategories && c.subcategories.some(s => s.id === id)) return c.icon;
                        }
                        return null;
                    }).filter(Boolean);
                    const uniqueIcons = [...new Set(parentIcons)];

                    return (
                        <div 
                            key={portfolio.id} 
                            className="space-y-2 cursor-pointer p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setSelectedPortfolio(portfolio)}
                        >
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{portfolio.name}</span>
                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {uniqueIcons.slice(0, 5).map((icon, i) => (
                                            <span key={i}>{icon}</span>
                                        ))}
                                        {uniqueIcons.length > 5 && <span>+{uniqueIcons.length - 5}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-right">
                                    {isExceeded && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                    <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300 font-bold'}>
                                        {formatCurrency(spentAmount)}
                                    </span>
                                    <span className="text-slate-400 font-medium">/ {formatCurrency(budgetAmount)}</span>
                                </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${barColor} transition-all duration-500`}
                                    style={{ width: `${percentSpent}%` }}
                                ></div>
                            </div>
                            
                            {isExceeded && (
                                <p className="text-xs text-rose-500 font-medium text-right">
                                    Đã vượt {formatCurrency(spentAmount - budgetAmount)}!
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <PortfolioTransactionsModal 
                isOpen={!!selectedPortfolio}
                onClose={() => setSelectedPortfolio(null)}
                portfolio={selectedPortfolio}
                transactions={transactions.filter(t => t.type === 'expense' && selectedPortfolio?.expenseCategoryIds?.includes(t.subcategoryId || t.categoryId))}
                categories={categories}
                onEditTransaction={onEditTransaction}
                onDeleteTransaction={onDeleteTransaction}
            />
        </div>
    );
};

export default BudgetProgressWidget;
