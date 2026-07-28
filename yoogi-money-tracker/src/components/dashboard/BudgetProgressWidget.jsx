import React, { useMemo } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const BudgetProgressWidget = ({ transactions, categories, budgetRules, dateRange }) => {
    // 1. Calculate total income and expenses per category
    const { totalIncome, categoryExpenses } = useMemo(() => {
        let income = 0;
        const expenses = {};

        transactions.forEach(t => {
            if (t.type === 'income') {
                income += Number(t.amount) || 0;
            } else if (t.type === 'expense') {
                const amount = Number(t.amount) || 0;
                expenses[t.categoryId] = (expenses[t.categoryId] || 0) + amount;
            }
        });

        return { totalIncome: income, categoryExpenses: expenses };
    }, [transactions]);

    // 2. Filter rules that have > 0 percentage
    const activeRules = useMemo(() => {
        return (budgetRules || []).filter(r => parseFloat(r.percentage) > 0);
    }, [budgetRules]);

    if (!activeRules || activeRules.length === 0) {
        return null; // Don't show if no budget rules set
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    Ngân quỹ tháng này
                </h3>
                <div className="text-sm text-slate-500">
                    Thu nhập: <span className="font-bold text-emerald-600">{formatCurrency(totalIncome)}</span>
                </div>
            </div>

            <div className="space-y-4">
                {activeRules.map(rule => {
                    const cat = categories.find(c => c.id === rule.categoryId);
                    if (!cat) return null;

                    const percentage = parseFloat(rule.percentage) || 0;
                    const budgetAmount = (totalIncome * percentage) / 100;
                    const spentAmount = categoryExpenses[rule.categoryId] || 0;
                    
                    const percentSpent = budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;
                    const isExceeded = spentAmount > budgetAmount && budgetAmount > 0;
                    const isNearLimit = percentSpent >= 80 && !isExceeded;

                    let barColor = 'bg-emerald-500';
                    if (isExceeded) barColor = 'bg-rose-500';
                    else if (isNearLimit) barColor = 'bg-amber-500';

                    return (
                        <div key={rule.categoryId} className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isExceeded && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                    <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300 font-medium'}>
                                        {formatCurrency(spentAmount)}
                                    </span>
                                    <span className="text-slate-400">/ {formatCurrency(budgetAmount)}</span>
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
