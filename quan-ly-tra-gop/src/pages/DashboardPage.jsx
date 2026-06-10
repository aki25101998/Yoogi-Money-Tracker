import React, { useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
    CreditCard, PieChart
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const DashboardPage = ({ transactions, categories, installmentItems }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate monthly stats
    const monthlyStats = useMemo(() => {
        const monthTxns = transactions.filter(t => t.date?.startsWith(currentMonth));
        const income = monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expense = monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { income, expense, balance: income - expense, count: monthTxns.length };
    }, [transactions, currentMonth]);

    // Top expense categories this month
    const topCategories = useMemo(() => {
        const monthExpenses = transactions.filter(t =>
            t.date?.startsWith(currentMonth) && t.type === 'expense'
        );

        const catMap = {};
        monthExpenses.forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? `${cat.icon} ${cat.name}` : '❓ Chưa phân loại';
            catMap[catName] = (catMap[catName] || 0) + (t.amount || 0);
        });

        return Object.entries(catMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));
    }, [transactions, categories, currentMonth]);

    // Recent transactions
    const recentTransactions = useMemo(() => {
        return transactions.slice(0, 8);
    }, [transactions]);

    // Daily spending for mini chart (last 7 days)
    const dailyData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayExpense = transactions
                .filter(t => t.date === dateStr && t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            const dayIncome = transactions
                .filter(t => t.date === dateStr && t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            days.push({
                label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
                date: dateStr,
                expense: dayExpense,
                income: dayIncome,
            });
        }
        return days;
    }, [transactions]);

    const maxDailyAmount = useMemo(() => {
        return Math.max(...dailyData.map(d => Math.max(d.expense, d.income)), 1);
    }, [dailyData]);

    // Installment stats
    const installmentStats = useMemo(() => {
        const active = installmentItems.filter(item => {
            const paidCount = item.paidMonths?.length || 0;
            return paidCount < item.term;
        });
        const monthlyTotal = active.reduce((sum, item) => sum + (item.monthlyPayment || 0), 0);
        return { active: active.length, monthlyTotal };
    }, [installmentItems]);

    const monthName = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Tổng quan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Balance */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-emerald-100" />
                            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Cân đối tháng</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(monthlyStats.balance)}</p>
                        <p className="text-emerald-200 text-xs mt-2">{monthlyStats.count} giao dịch</p>
                    </div>
                </div>

                {/* Income */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Thu nhập</span>
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl">
                            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlyStats.income)}</p>
                </div>

                {/* Expense */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Chi tiêu</span>
                        <div className="bg-rose-50 dark:bg-rose-900/30 p-2 rounded-xl">
                            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(monthlyStats.expense)}</p>
                </div>

                {/* Installments */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Trả góp/tháng</span>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(installmentStats.monthlyTotal)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{installmentStats.active} khoản đang trả</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mini Bar Chart: Last 7 days */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-slate-400" />
                        Chi tiêu 7 ngày qua
                    </h3>
                    <div className="flex items-end gap-2 h-40">
                        {dailyData.map((day, i) => {
                            const expenseHeight = (day.expense / maxDailyAmount) * 100;
                            const isToday = i === dailyData.length - 1;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex flex-col justify-end h-28 relative group">
                                        {/* Tooltip */}
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-600 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                            {formatCurrency(day.expense)}
                                        </div>
                                        <div
                                            className={`w-full rounded-t-lg transition-all duration-500 ${
                                                isToday
                                                    ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                                                    : 'bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-600 dark:to-slate-500'
                                            }`}
                                            style={{ height: `${Math.max(expenseHeight, 4)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-medium ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {day.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-slate-400" />
                        Top danh mục chi tiêu
                    </h3>
                    {topCategories.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                            Chưa có dữ liệu
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topCategories.map((cat, i) => {
                                const maxAmount = topCategories[0]?.amount || 1;
                                const width = (cat.amount / maxAmount) * 100;
                                const colors = [
                                    'from-rose-500 to-pink-500',
                                    'from-orange-500 to-amber-500',
                                    'from-blue-500 to-indigo-500',
                                    'from-purple-500 to-violet-500',
                                    'from-teal-500 to-cyan-500',
                                ];
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{cat.name}</span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCurrency(cat.amount)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700`}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao dịch gần đây</h3>
                </div>
                {recentTransactions.length === 0 ? (
                    <div className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên!
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {recentTransactions.map(txn => {
                            const cat = categories.find(c => c.id === txn.categoryId);
                            const sub = cat?.subcategories?.find(s => s.id === txn.subcategoryId);
                            const isIncome = txn.type === 'income';
                            return (
                                <div key={txn.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                                        {cat?.icon || '❓'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{txn.description}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            {sub?.name || 'Chưa phân loại'} • {new Date(txn.date).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
