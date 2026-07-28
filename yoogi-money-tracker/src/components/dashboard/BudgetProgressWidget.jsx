import React, { useMemo } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const BudgetProgressWidget = ({ transactions, categories, budgetSettings, budgetPortfolios, dateRange }) => {
    // 1. Calculate base income and map expenses
    const { totalIncome, categoryExpenses } = useMemo(() => {
        let income = 0;
        const expenses = {};

        const validIncomeIds = budgetSettings?.incomeCategoryIds || [];

        transactions.forEach(t => {
            if (t.type === 'income' && validIncomeIds.includes(t.categoryId)) {
                income += Number(t.amount) || 0;
            } else if (t.type === 'expense') {
                const amount = Number(t.amount) || 0;
                expenses[t.categoryId] = (expenses[t.categoryId] || 0) + amount;
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
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    Ngân quỹ tháng này
                </h3>
                <div className="text-sm text-slate-500">
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

                    // Get icons for the categories
                    const cats = portfolio.expenseCategoryIds.map(id => categories.find(c => c.id === id)).filter(Boolean);

                    return (
                        <div key={portfolio.id} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{portfolio.name}</span>
                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {cats.slice(0, 3).map((c, i) => (
                                            <span key={i} title={c.name}>{c.icon}</span>
                                        ))}
                                        {cats.length > 3 && <span>+{cats.length - 3}</span>}
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
        </div>
    );
};

export default BudgetProgressWidget;
