import React, { useState, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
    CreditCard, PieChart as PieChartIcon, Sparkles, Loader2, Plus, Pencil
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage } from '../utils/firebaseHelpers';
import TransactionModal from '../components/modals/TransactionModal';

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const DashboardPage = ({ user, transactions, categories, aiMemories, wallets, installmentItems }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- AI Input State ---
    const [aiInput, setAiInput] = useState('');
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState(null);

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // --- Stats ---
    const monthlyStats = useMemo(() => {
        const monthTxns = transactions.filter(t => t.date?.startsWith(currentMonth));
        const income = monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expense = monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { income, expense, balance: income - expense, count: monthTxns.length };
    }, [transactions, currentMonth]);

    const walletBalances = useMemo(() => {
        const balances = {};
        wallets?.forEach(w => { balances[w.id] = { name: w.name, icon: w.icon, balance: 0 }; });
        
        transactions.forEach(t => {
            if (!t.walletId || !balances[t.walletId]) return;
            if (t.type === 'income') balances[t.walletId].balance += t.amount;
            else if (t.type === 'expense') balances[t.walletId].balance -= t.amount;
        });
        return Object.values(balances);
    }, [transactions, wallets]);

    // Top categories for Pie Chart
    const pieChartData = useMemo(() => {
        const monthExpenses = transactions.filter(t =>
            t.date?.startsWith(currentMonth) && t.type === 'expense'
        );

        const catMap = {};
        monthExpenses.forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? cat.name : 'Chưa phân loại';
            catMap[catName] = (catMap[catName] || 0) + (t.amount || 0);
        });

        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // top 8 to prevent chart clutter
    }, [transactions, categories, currentMonth]);

    const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

    const installmentStats = useMemo(() => {
        const active = installmentItems.filter(item => {
            const paidCount = item.paidMonths?.length || 0;
            return paidCount < item.term;
        });
        const monthlyTotal = active.reduce((sum, item) => sum + (item.monthlyPayment || 0), 0);
        return { active: active.length, monthlyTotal };
    }, [installmentItems]);

    // --- Handlers ---
    const handleAISubmit = async () => {
        if (!aiInput.trim() || !user) return;
        setIsAIProcessing(true);
        setAiStatus(null);

        try {
            const defaultWallet = wallets?.find(w => w.isDefault)?.id || wallets?.[0]?.id || '';
            const result = await categorizeTransaction(aiInput, categories, aiMemories);

            await addTransaction(user.uid, {
                type: result.type,
                amount: result.amount,
                description: result.description,
                categoryId: result.categoryId,
                subcategoryId: result.subcategoryId,
                date: result.date,
                walletId: defaultWallet,
                aiCategorized: result.aiCategorized,
            });

            if (result.memoryId) {
                await incrementMemoryUsage(user.uid, result.memoryId);
            }

            const cat = categories.find(c => c.id === result.categoryId);
            setAiStatus({
                type: 'success',
                message: `✅ Đã thêm: ${result.description} — ${formatCurrency(result.amount)} → ${cat ? cat.name : '❓'}`,
            });
            setAiInput('');
        } catch (error) {
            setAiStatus({ type: 'error', message: `❌ ${error.message}` });
        } finally {
            setIsAIProcessing(false);
            setTimeout(() => setAiStatus(null), 5000);
        }
    };

    const handleSaveTransaction = async (formData) => {
        if (!user) return;
        try {
            if (editingTransaction) {
                const { updateTransaction } = await import('../utils/firebaseHelpers');
                await updateTransaction(user.uid, editingTransaction.id, formData);
            } else {
                await addTransaction(user.uid, { ...formData, aiCategorized: false });
            }
            setIsModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-white">{payload[0].name}</p>
                    <p className="text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Input Section (Moved from Transactions) */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-200/50 to-transparent dark:from-emerald-500/10 rounded-full -translate-y-16 translate-x-16" />
                
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-emerald-100 dark:bg-emerald-800/50 p-1.5 rounded-lg">
                                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Nhập nhanh bằng AI</span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAISubmit()}
                                placeholder="Vd: ăn sáng 50k, grab 30k, lương 15 triệu..."
                                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                disabled={isAIProcessing}
                            />
                            <button
                                onClick={handleAISubmit}
                                disabled={isAIProcessing || !aiInput.trim()}
                                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
                            >
                                {isAIProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ghi'}
                            </button>
                        </div>
                    </div>

                    <div className="hidden sm:block w-px h-16 bg-emerald-200 dark:bg-emerald-800/50 mx-2" />

                    <button
                        onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                        className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition-all"
                    >
                        <Plus className="w-5 h-5 text-emerald-500" />
                        <span className="whitespace-nowrap">Thêm thủ công</span>
                    </button>
                </div>

                {aiStatus && (
                    <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                        aiStatus.type === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                    }`}>
                        {aiStatus.message}
                    </div>
                )}
            </div>

            {/* Wallets & Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Balance (Combined) */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-emerald-100" />
                            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Cân đối tháng</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(monthlyStats.balance)}</p>
                    </div>
                </div>

                {/* Wallets Overview */}
                {walletBalances.slice(0, 2).map((w, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{w.icon}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{w.name}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(w.balance)}</p>
                    </div>
                ))}

                {/* Installments */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Trả góp/tháng</span>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(installmentStats.monthlyTotal)}</p>
                </div>
            </div>

            {/* Charts & Recent Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart: Top Categories */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-slate-400" />
                        Cơ cấu chi tiêu tháng này
                    </h3>
                    {pieChartData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-10">
                            Chưa có dữ liệu chi tiêu
                        </div>
                    ) : (
                        <div className="flex-1 h-64 min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                            if (percent < 0.05) return null;
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                            return (
                                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold">
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao dịch gần đây</h3>
                    </div>
                    {recentTransactions.length === 0 ? (
                        <div className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-sm flex-1">
                            Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên!
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50 flex-1 overflow-y-auto max-h-[300px]">
                            {recentTransactions.map(txn => {
                                const cat = categories.find(c => c.id === txn.categoryId);
                                const isIncome = txn.type === 'income';
                                const wallet = wallets?.find(w => w.id === txn.walletId);
                                
                                return (
                                    <div key={txn.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer" onClick={() => { setEditingTransaction(txn); setIsModalOpen(true); }}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                                            {cat?.icon || '❓'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{txn.description}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                {wallet?.icon} {wallet?.name || 'Chưa rõ ví'} • {new Date(txn.date).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                        <span className={`text-sm font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                        </span>
                                        <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                categories={categories}
                wallets={wallets}
                initialData={editingTransaction}
            />
        </div>
    );
};

export default DashboardPage;
