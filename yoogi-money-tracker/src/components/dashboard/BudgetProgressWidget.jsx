import React, { useMemo, useState } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import PortfolioTransactionsModal from '../modals/PortfolioTransactionsModal';
import BaseIncomeModal from '../modals/BaseIncomeModal';
import { isExpenseTransaction, isIncomeTransaction } from '../../utils/transactionUtils';

const BudgetProgressWidget = ({ transactions, categories, wallets, budgetSettings, budgetPortfolios, dateRange, onEditTransaction, onDeleteTransaction }) => {
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);
    const [isBaseIncomeModalOpen, setIsBaseIncomeModalOpen] = useState(false);
    const [isCrossBudgetEnabled, setIsCrossBudgetEnabled] = useState(() => {
        try {
            return localStorage.getItem('yoogi_cross_budget_enabled') === 'true';
        } catch (e) {
            return false;
        }
    });

    const handleToggleCrossBudget = () => {
        const newValue = !isCrossBudgetEnabled;
        setIsCrossBudgetEnabled(newValue);
        try {
            localStorage.setItem('yoogi_cross_budget_enabled', newValue);
        } catch (e) {
            console.error('Lỗi lưu cấu hình:', e);
        }
    };

    // 1. Calculate base income and map expenses
    const { totalIncome, categoryExpenses, baseIncomeTransactions } = useMemo(() => {
        let income = 0;
        const expenses = {};
        const baseTxns = [];

        const validIncomeIds = budgetSettings?.incomeCategoryIds || [];
        const validWalletIds = budgetSettings?.walletIds || [];
        const applyWalletFilter = validWalletIds.length > 0;

        transactions.forEach(t => {
            if (applyWalletFilter && !validWalletIds.includes(t.walletId)) return;

            const isIncomeMatch = isIncomeTransaction(t) && (
                validIncomeIds.includes(t.categoryId) || 
                (t.subcategoryId && validIncomeIds.includes(t.subcategoryId))
            );

            if (isIncomeMatch) {
                income += Number(t.amount) || 0;
                baseTxns.push(t);
            } else if (isExpenseTransaction(t)) {
                const amount = Number(t.amount) || 0;
                const idToTrack = t.subcategoryId || t.categoryId;
                if (idToTrack) {
                    expenses[idToTrack] = (expenses[idToTrack] || 0) + amount;
                }
            }
        });

        baseTxns.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return { totalIncome: income, categoryExpenses: expenses, baseIncomeTransactions: baseTxns };
    }, [transactions, budgetSettings]);

    // 2. Filter active portfolios
    const activePortfolios = useMemo(() => {
        return (budgetPortfolios || []).filter(p => parseFloat(p.percentage) > 0 && p.expenseCategoryIds && p.expenseCategoryIds.length > 0);
    }, [budgetPortfolios]);

    // 3. Calculate portfolio stats with optional cross-budgeting
    const portfolioStats = useMemo(() => {
        if (!activePortfolios || activePortfolios.length === 0) return [];

        let stats = activePortfolios.map(portfolio => {
            const percentage = parseFloat(portfolio.percentage) || 0;
            const originalBudget = (totalIncome * percentage) / 100;
            const spentAmount = portfolio.expenseCategoryIds.reduce((sum, catId) => sum + (categoryExpenses[catId] || 0), 0);
            
            return {
                ...portfolio,
                originalBudget,
                spentAmount,
                currentBudget: originalBudget,
                borrowedAmount: 0,
                lentAmount: 0,
            };
        });

        if (isCrossBudgetEnabled) {
            let deficits = stats.filter(p => p.spentAmount > p.originalBudget);
            let surpluses = stats.filter(p => p.originalBudget > p.spentAmount);

            for (let def of deficits) {
                let needed = def.spentAmount - def.originalBudget;
                
                for (let sur of surpluses) {
                    if (needed <= 0) break;
                    
                    let available = sur.currentBudget - sur.spentAmount;
                    if (available <= 0) continue;

                    let transfer = Math.min(needed, available);
                    
                    sur.currentBudget -= transfer;
                    sur.lentAmount += transfer;
                    
                    def.currentBudget += transfer;
                    def.borrowedAmount += transfer;
                    
                    needed -= transfer;
                }
            }
        }

        return stats;
    }, [activePortfolios, totalIncome, categoryExpenses, isCrossBudgetEnabled]);

    if (!activePortfolios || activePortfolios.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Ngân quỹ tháng này
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={isCrossBudgetEnabled}
                            onChange={handleToggleCrossBudget}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        Bù trừ chéo
                    </label>
                </div>
                <div className="pl-7">
                    <button
                        type="button"
                        onClick={() => setIsBaseIncomeModalOpen(true)}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 -ml-2.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200/60 dark:hover:border-emerald-800/60 transition-all cursor-pointer text-left"
                        title="Bấm để xem thống kê các nguồn thu nhập cơ sở"
                    >
                        <span className="pointer-events-none">Thu nhập cơ sở:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 underline decoration-dashed underline-offset-4 group-hover:decoration-solid pointer-events-none">
                            {formatCurrency(totalIncome)}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-md ml-0.5 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/60 transition-colors pointer-events-none">
                            Chi tiết
                        </span>
                    </button>
                </div>
            </div>

            <div className="space-y-5">
                {portfolioStats.map(stat => {
                    const { originalBudget, currentBudget, spentAmount, borrowedAmount, lentAmount } = stat;
                    
                    const percentSpent = currentBudget > 0 ? Math.min((spentAmount / currentBudget) * 100, 100) : (spentAmount > 0 ? 100 : 0);
                    const isExceeded = spentAmount > currentBudget && currentBudget > 0;
                    const isNearLimit = percentSpent >= 80 && !isExceeded;

                    let barColor = 'bg-emerald-500';
                    if (isExceeded) barColor = 'bg-rose-500';
                    else if (isNearLimit) barColor = 'bg-amber-500';

                    // Get unique parent icons for the selected categories
                    const parentIcons = stat.expenseCategoryIds.map(id => {
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
                            key={stat.id} 
                            className="space-y-2 cursor-pointer p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setSelectedPortfolio(stat)}
                        >
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{stat.name}</span>
                                        <span className="text-xs font-medium text-slate-400">({stat.percentage}%)</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {uniqueIcons.slice(0, 5).map((icon, i) => (
                                            <span key={i}>{icon}</span>
                                        ))}
                                        {uniqueIcons.length > 5 && <span>+{uniqueIcons.length - 5}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2 text-right">
                                        {isExceeded && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                        <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300 font-bold'}>
                                            {formatCurrency(spentAmount)}
                                        </span>
                                        <span className="text-slate-400 font-medium">/ {formatCurrency(currentBudget)}</span>
                                    </div>
                                    {isCrossBudgetEnabled && (borrowedAmount > 0 || lentAmount > 0) && (
                                        <div className="flex gap-1">
                                            {borrowedAmount > 0 && (
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                    Được bù +{formatCurrency(borrowedAmount)} (Lên {totalIncome > 0 ? Math.round((currentBudget / totalIncome) * 100 * 10) / 10 : 0}%)
                                                </span>
                                            )}
                                            {lentAmount > 0 && (
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                                    Cho mượn -{formatCurrency(lentAmount)} (Còn {totalIncome > 0 ? Math.round((currentBudget / totalIncome) * 100 * 10) / 10 : 0}%)
                                                </span>
                                            )}
                                        </div>
                                    )}
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
                                    Đã vượt {formatCurrency(spentAmount - currentBudget)}!
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
                transactions={transactions.filter(t => isExpenseTransaction(t) && selectedPortfolio?.expenseCategoryIds?.includes(t.subcategoryId || t.categoryId))}
                categories={categories}
                onEditTransaction={onEditTransaction}
                onDeleteTransaction={onDeleteTransaction}
            />

            <BaseIncomeModal
                isOpen={isBaseIncomeModalOpen}
                onClose={() => setIsBaseIncomeModalOpen(false)}
                totalIncome={totalIncome}
                transactions={baseIncomeTransactions}
                categories={categories}
                wallets={wallets}
                onEditTransaction={onEditTransaction}
                onDeleteTransaction={onDeleteTransaction}
            />
        </div>
    );
};

export default BudgetProgressWidget;
