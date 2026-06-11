import React, { useState, useMemo } from 'react';
import {
    Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
    PieChart as PieChartIcon, Sparkles, Loader2, Plus, Pencil,
    Filter, Calendar, ChevronDown, Check, Info
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, updateWalletOrder, addWallet } from '../utils/firebaseHelpers';
import TransactionModal from '../components/modals/TransactionModal';
import WalletModal from '../components/modals/WalletModal';

import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const SortableWalletCard = ({ w, isSelected, onClick }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: w.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            {...attributes} 
            {...listeners}
            className={`min-w-[140px] flex-shrink-0 rounded-2xl p-4 border cursor-grab active:cursor-grabbing touch-none transition-all ${isDragging ? 'scale-105 shadow-xl border-emerald-500' : isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{w.icon}</span>
                {isSelected ? <Check className="w-4 h-4 text-emerald-500" /> : null}
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mb-1">{w.name}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(w.balance)}</p>
        </div>
    );
};

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

const DashboardPage = ({ user, transactions, categories, aiMemories, wallets }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- State ---
    const [selectedWalletIds, setSelectedWalletIds] = useState([]);
    const [aiInput, setAiInput] = useState('');
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = walletBalances.findIndex(w => w.id === active.id);
            const newIndex = walletBalances.findIndex(w => w.id === over.id);
            const newWallets = arrayMove(walletBalances, oldIndex, newIndex);
            try {
                await updateWalletOrder(user.uid, newWallets.map(w => w.id));
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleSaveWallet = async (formData) => {
        if (!user) return;
        try {
            await addWallet(user.uid, {
                name: formData.name,
                icon: formData.icon,
                isDefault: false,
                order: walletBalances.length,
            });
            setIsWalletModalOpen(false);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const [timeFilter, setTimeFilter] = useState('month'); 
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'

    // --- Date Helpers ---
    const getStartOfWeek = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(date.setDate(diff)).setHours(0,0,0,0);
    };

    // --- Calculations ---
    const walletBalances = useMemo(() => {
        const balances = {};
        wallets?.forEach(w => { balances[w.id] = { id: w.id, name: w.name, icon: w.icon, balance: 0 }; });
        
        transactions.forEach(t => {
            if (!t.walletId || !balances[t.walletId]) return;
            if (t.type === 'income') balances[t.walletId].balance += t.amount;
            else if (t.type === 'expense') balances[t.walletId].balance -= t.amount;
        });
        return Object.values(balances);
    }, [transactions, wallets]);

    const totalBalance = useMemo(() => {
        if (selectedWalletIds.length === 0) {
            return walletBalances.reduce((sum, w) => sum + w.balance, 0);
        }
        return walletBalances
            .filter(w => selectedWalletIds.includes(w.id))
            .reduce((sum, w) => sum + w.balance, 0);
    }, [walletBalances, selectedWalletIds]);

    const filteredTransactions = useMemo(() => {
        const todayStr = now.toISOString().split('T')[0];
        const currentYear = `${now.getFullYear()}`;
        const startOfWeek = getStartOfWeek(now);

        return transactions.filter(t => {
            if (!t.date) return false;
            if (selectedWalletIds.length > 0 && !selectedWalletIds.includes(t.walletId)) return false;
            const tDate = new Date(t.date);

            switch (timeFilter) {
                case 'today': return t.date === todayStr;
                case 'week': return tDate.getTime() >= startOfWeek && tDate.getTime() <= now.getTime();
                case 'month': return t.date.startsWith(currentMonth);
                case 'year': return t.date.startsWith(currentYear);
                case 'custom':
                    if (customDateRange.start && t.date < customDateRange.start) return false;
                    if (customDateRange.end && t.date > customDateRange.end) return false;
                    return true;
                default: return true;
            }
        });
    }, [transactions, timeFilter, customDateRange, currentMonth, now]);

    const summaryStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    const pieChartData = useMemo(() => {
        const filteredByType = filteredTransactions.filter(t => t.type === chartType);
        const totalAmount = filteredByType.reduce((sum, t) => sum + (t.amount || 0), 0);

        const catMap = {};
        filteredByType.forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? cat.name : 'Chưa phân loại';
            const catIcon = cat ? cat.icon : '❓';
            if (!catMap[catName]) catMap[catName] = { name: catName, icon: catIcon, value: 0 };
            catMap[catName].value += (t.amount || 0);
        });

        return Object.values(catMap)
            .sort((a, b) => b.value - a.value)
            .map(item => ({
                ...item,
                percent: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0
            }))
            .slice(0, 8); 
    }, [filteredTransactions, categories, chartType]);

    const recentTransactions = useMemo(() => filteredTransactions.slice(0, 5), [filteredTransactions]);

    // --- Handlers ---
    const handleAISubmit = async () => {
        if (!aiInput.trim() || !user) return;
        setIsAIProcessing(true);
        setAiStatus(null);

        try {
            const defaultWallet = wallets?.find(w => w.isDefault)?.id || wallets?.[0]?.id || '';
            const activeWalletId = selectedWalletIds.length === 1 ? selectedWalletIds[0] : defaultWallet;
            const result = await categorizeTransaction(aiInput, categories, aiMemories);

            await addTransaction(user.uid, {
                type: result.type,
                amount: result.amount,
                description: result.description,
                categoryId: result.categoryId,
                subcategoryId: result.subcategoryId,
                date: result.date,
                walletId: activeWalletId,
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

    const handleDeleteTransaction = async (transactionId) => {
        if (!user) return;
        try {
            const { deleteTransaction } = await import('../utils/firebaseHelpers');
            await deleteTransaction(user.uid, transactionId);
            setIsModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi khi xóa: ' + err.message);
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {payload[0].payload.icon} {payload[0].name}
                    </p>
                    <p className={`font-medium ${chartType === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-20 relative min-h-screen">
            
            {/* 1. AI Input Bar (Compact) */}
            <div className="bg-white dark:bg-slate-800 rounded-full p-2 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
                <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAISubmit()}
                    placeholder="Nhập nhanh: ăn sáng 50k..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 dark:text-slate-200"
                    disabled={isAIProcessing}
                />
                <button
                    onClick={handleAISubmit}
                    disabled={isAIProcessing || !aiInput.trim()}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                    {isAIProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                </button>
            </div>
            {aiStatus && (
                <div className={`px-4 py-2 rounded-xl text-xs font-medium text-center ${aiStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {aiStatus.message}
                </div>
            )}

            {/* 2. Total Balance & Wallets */}
            <div className="text-center pt-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Tổng số dư</p>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {formatCurrency(totalBalance)}
                </h1>
            </div>

            <div className="px-1 mb-2 flex items-center">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input 
                        type="radio" 
                        name="selectAllWallets"
                        checked={selectedWalletIds.length === 0} 
                        onChange={() => setSelectedWalletIds([])}
                        className="w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500"
                    />
                    Tất cả ví
                </label>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 pt-2 px-1 hide-scrollbar">

                {/* Các ví cụ thể */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
                    <SortableContext items={walletBalances.map(w => w.id)} strategy={horizontalListSortingStrategy}>
                        {walletBalances.map((w, i) => {
                            const isSelected = selectedWalletIds.length === 0 || selectedWalletIds.includes(w.id);
                            return (
                                <SortableWalletCard 
                                    key={w.id} 
                                    w={w} 
                                    isSelected={isSelected} 
                                    onClick={() => {
                                        if (selectedWalletIds.includes(w.id)) {
                                            setSelectedWalletIds(selectedWalletIds.filter(id => id !== w.id));
                                        } else {
                                            setSelectedWalletIds([...selectedWalletIds, w.id]);
                                        }
                                    }} 
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {/* Thêm ví mới */}
                <div 
                    onClick={() => setIsWalletModalOpen(true)}
                    className="min-w-[140px] flex-shrink-0 rounded-2xl p-4 border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-sm font-bold">Thêm ví</p>
                </div>
            </div>

            {/* 3. Time Filter & Net Change Card */}
            <div>
                <div className="relative inline-block mb-3">
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold py-2 pl-4 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm cursor-pointer"
                    >
                        <option value="today">Hôm nay</option>
                        <option value="week">Tuần này</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm nay</option>
                        <option value="custom">Tùy chỉnh</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                {timeFilter === 'custom' && (
                    <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-sm">
                        <input type="date" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} className="px-2 py-1 border rounded" />
                        <span className="self-center">-</span>
                        <input type="date" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} className="px-2 py-1 border rounded" />
                    </div>
                )}

                {/* Net Change Card - Themed like the image */}
                <div className="bg-gradient-to-br from-cyan-100 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 rounded-[28px] p-6 shadow-sm border border-white/50 dark:border-cyan-800/30">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-slate-600 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                                Thay đổi ròng <Info className="w-4 h-4 text-slate-400" />
                            </p>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {formatCurrency(summaryStats.balance)}
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 text-center">
                            <p className="text-rose-500 text-xs font-bold uppercase mb-1">Chi phí</p>
                            <p className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-1">
                                <ArrowDownRight className="w-4 h-4" />
                                {formatCurrency(summaryStats.expense)}
                            </p>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 text-center">
                            <p className="text-emerald-500 text-xs font-bold uppercase mb-1">Thu nhập</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                                <ArrowUpRight className="w-4 h-4" />
                                {formatCurrency(summaryStats.income)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Chart Toggle & Donut Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                
                {/* Toggle */}
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-full flex">
                        <button
                            onClick={() => setChartType('expense')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${chartType === 'expense' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Chi phí
                        </button>
                        <button
                            onClick={() => setChartType('income')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${chartType === 'income' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Thu nhập
                        </button>
                    </div>
                </div>

                {/* Donut Chart */}
                {pieChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        Chưa có dữ liệu {chartType === 'income' ? 'thu nhập' : 'chi phí'}
                    </div>
                ) : (
                    <>
                        <div className="h-64 mb-6 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Inner Donut Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-bold uppercase mb-1">Tổng cộng</span>
                                <span className="text-lg font-bold text-slate-800 dark:text-white">
                                    {formatCurrency(summaryStats[chartType])}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bars List */}
                        <div className="space-y-4">
                            {pieChartData.map((item, idx) => (
                                <div key={idx} className="relative">
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm shadow-inner">
                                                {item.icon}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(item.value)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${Math.max(item.percent, 2)}%`, 
                                                backgroundColor: COLORS[idx % COLORS.length] 
                                            }}
                                        />
                                    </div>
                                    <div className="text-right mt-1">
                                        <span className="text-[10px] font-bold text-slate-400">{item.percent.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 6. Recent Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao dịch gần đây</h3>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {recentTransactions.length === 0 ? (
                        <div className="px-5 py-8 text-center text-slate-400 text-sm">
                            Chưa có giao dịch.
                        </div>
                    ) : (
                        recentTransactions.map(txn => {
                            const cat = categories.find(c => c.id === txn.categoryId);
                            const isIncome = txn.type === 'income';
                            return (
                                <div key={txn.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => { setEditingTransaction(txn); setIsModalOpen(true); }}>
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                                        {cat?.icon || '❓'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{txn.description}</p>
                                        <p className="text-xs text-slate-400 truncate">{cat?.name || 'Chưa phân loại'}</p>
                                    </div>
                                    <span className={`text-sm font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                className="fixed bottom-20 right-6 md:bottom-6 md:right-8 w-14 h-14 bg-slate-800 dark:bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-slate-400/30 dark:shadow-none hover:scale-105 active:scale-95 transition-all z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modals */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                onDelete={handleDeleteTransaction}
                categories={categories}
                wallets={wallets}
                initialData={editingTransaction}
                defaultWalletId={selectedWalletIds.length === 1 ? selectedWalletIds[0] : null}
            />

            <WalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
                mode="add"
                onSave={handleSaveWallet}
            />
        </div>
    );
};

export default DashboardPage;
