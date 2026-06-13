import React, { useState, useMemo, useEffect } from 'react';
import {
    Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
    PieChart as PieChartIcon, Sparkles, Loader2, Plus, Pencil,
    Filter, Calendar, ChevronDown, Check, Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, updateWalletOrder, addWallet } from '../utils/firebaseHelpers';
import TransactionModal from '../components/modals/TransactionModal';
import WalletModal from '../components/modals/WalletModal';
import ReorderWalletsModal from '../components/modals/ReorderWalletsModal';
import DateRangeSelector from '../components/DateRangeSelector';
import AIChatModal from '../components/chat/AIChatModal';
import AIContextModal from '../components/modals/AIContextModal';
import { Bot, PenSquare } from 'lucide-react';

import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const SortableWalletCard = ({ w, isSelected, onClick, onClickEdit, onLongPress }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: w.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const [startLongPress, setStartLongPress] = useState(false);
    useEffect(() => {
        let timerId;
        if (startLongPress) {
            timerId = setTimeout(() => {
                setStartLongPress(false);
                if (onLongPress) onLongPress();
            }, 500);
        } else {
            clearTimeout(timerId);
        }
        return () => clearTimeout(timerId);
    }, [startLongPress, onLongPress]);

    const longPressProps = {
        onTouchStart: () => setStartLongPress(true),
        onTouchEnd: () => setStartLongPress(false),
        onTouchMove: () => setStartLongPress(false),
        onTouchCancel: () => setStartLongPress(false),
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            {...attributes} 
            {...listeners}
            {...longPressProps}
            className={`min-w-[140px] flex-shrink-0 rounded-2xl p-4 border cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'scale-105 shadow-xl border-emerald-500' : isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{w.icon}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClickEdit(w); }}
                    className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Sửa ví"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mb-1">{w.name}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(w.balance)}</p>
        </div>
    );
};

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

const DashboardPage = ({ user, transactions, categories, aiMemories, wallets, onNavigate }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- State ---
    const [selectedWalletIds, setSelectedWalletIds] = useState([]);
    
    // UI States
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isAIContextOpen, setIsAIContextOpen] = useState(false);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });

    const [walletModalMode, setWalletModalMode] = useState('add');
    const [editingWallet, setEditingWallet] = useState(null);

    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'
    const [activeSegment, setActiveSegment] = useState(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.recharts-wrapper')) {
                setActiveSegment(null);
            }
        };
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
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
            if (walletModalMode === 'edit' && editingWallet) {
                const { updateWallet } = await import('../utils/firebaseHelpers');
                await updateWallet(user.uid, editingWallet.id, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                });
            } else {
                await addWallet(user.uid, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                    isDefault: false,
                    order: walletBalances.length,
                });
            }
            setIsWalletModalOpen(false);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    // --- Calculations ---
    const walletBalances = useMemo(() => {
        const balances = {};
        wallets?.forEach(w => { balances[w.id] = { ...w, balance: w.initialBalance || 0 }; });
        
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
        return transactions.filter(t => {
            if (!t.date) return false;
            if (selectedWalletIds.length > 0 && !selectedWalletIds.includes(t.walletId)) return false;

            if (dateRange.start && t.date < dateRange.start) return false;
            if (dateRange.end && t.date > dateRange.end) return false;

            return true;
        });
    }, [transactions, dateRange, selectedWalletIds]);

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
            .map((item, index) => ({
                ...item,
                percent: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
                fill: COLORS[index % COLORS.length]
            }))
            .slice(0, 8); 
    }, [filteredTransactions, categories, chartType]);

    const recentTransactions = useMemo(() => filteredTransactions.slice(0, 5), [filteredTransactions]);

    // --- Handlers ---

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

    const handlePieMouseEnter = (data, index) => {
        const midAngle = (data.startAngle + data.endAngle) / 2;
        const normalized = ((midAngle % 360) + 360) % 360;
        const radian = (Math.PI / 180) * midAngle;

        const tooltipDistance = (data.outerRadius || 100) + 22;
        const x = data.cx + tooltipDistance * Math.cos(radian);
        const y = data.cy - tooltipDistance * Math.sin(radian);

        let direction, transform;
        if (normalized >= 315 || normalized < 45) {
            direction = 'right';
            transform = 'translate(6px, -50%)';
        } else if (normalized >= 45 && normalized < 135) {
            direction = 'top';
            transform = 'translate(-50%, calc(-100% - 6px))';
        } else if (normalized >= 135 && normalized < 225) {
            direction = 'left';
            transform = 'translate(calc(-100% - 6px), -50%)';
        } else {
            direction = 'bottom';
            transform = 'translate(-50%, 6px)';
        }

        setActiveSegment({
            data: pieChartData[index],
            x, y, direction, transform, index,
        });
    };

    const handlePieMouseLeave = () => {
        setActiveSegment(null);
    };

    return (
        <div className="space-y-6 pb-20 relative min-h-screen">
            {/* 1. Dashboard Header - (Old AI Bar removed) */}

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

            <div className="flex overflow-x-auto gap-3 pb-2 pt-2 px-1 no-scrollbar">

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
                                    onClickEdit={(wData) => {
                                        setWalletModalMode('edit');
                                        setEditingWallet(wData);
                                        setIsWalletModalOpen(true);
                                    }}
                                    onLongPress={() => setIsReorderModalOpen(true)}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {/* Thêm ví mới */}
                <div 
                    onClick={() => {
                        setWalletModalMode('add');
                        setEditingWallet(null);
                        setIsWalletModalOpen(true);
                    }}
                    className="min-w-[140px] flex-shrink-0 rounded-2xl p-4 border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-sm font-bold">Thêm ví</p>
                </div>
            </div>

            {/* 3. Time Filter & Net Change Card */}
            <div>
                <div className="mb-4">
                    <DateRangeSelector 
                        initialMode="month" 
                        onChange={(range) => setDateRange(range)} 
                    />
                </div>

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

                    <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                            <p className="text-rose-500 text-xs font-bold uppercase sm:mb-1">Chi phí</p>
                            <p className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <ArrowDownRight className="w-4 h-4" />
                                {formatCurrency(summaryStats.expense)}
                            </p>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                            <p className="text-emerald-500 text-xs font-bold uppercase sm:mb-1">Thu nhập</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
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
                        <div className="h-64 mb-6 relative overflow-visible">
                            {/* Inner Donut Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                                <span className="text-slate-400 text-xs font-bold uppercase mb-1">Tổng cộng</span>
                                <span className="text-lg font-bold text-slate-800 dark:text-white">
                                    {formatCurrency(summaryStats[chartType])}
                                </span>
                            </div>
                            
                            <div className="relative z-10 w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                            activeIndex={-1}
                                            activeShape={false}
                                            isAnimationActive={true}
                                            onMouseEnter={handlePieMouseEnter}
                                            onMouseLeave={handlePieMouseLeave}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" strokeWidth={0} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Custom Tooltip (PC only) */}
                            {activeSegment && (
                                <div 
                                    className="absolute z-30 pointer-events-none hidden md:block"
                                    style={{
                                        left: activeSegment.x,
                                        top: activeSegment.y,
                                        transform: activeSegment.transform,
                                    }}
                                >
                                    <div 
                                        key={`seg-${activeSegment.index}`}
                                        className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[120px] whitespace-nowrap"
                                        style={{
                                            animation: `tooltip-slide-${activeSegment.direction} 0.25s ease-out both`,
                                        }}
                                    >
                                        <p className="text-sm text-slate-600 dark:text-white mb-1">
                                            {activeSegment.data.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-sm" 
                                                style={{ backgroundColor: activeSegment.data.fill || COLORS[0] }} 
                                            />
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                {formatCurrency(activeSegment.data.value)} ({activeSegment.data.percent ? activeSegment.data.percent.toFixed(1) : 0}%)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Tooltip Fixed (Mobile only) */}
                        <div className="md:hidden min-h-[60px] flex items-center justify-center -mt-4 mb-4 transition-all px-4">
                            {activeSegment ? (
                                <div 
                                    key={`seg-mobile-${activeSegment.index}`}
                                    className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 w-full animate-in fade-in zoom-in-95 duration-200"
                                >
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 text-center font-bold uppercase tracking-wider">
                                        {activeSegment.data.name}
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-sm shadow-sm" 
                                            style={{ backgroundColor: activeSegment.data.fill || COLORS[0] }} 
                                        />
                                        <p className="text-base font-bold text-slate-800 dark:text-white">
                                            {formatCurrency(activeSegment.data.value)} 
                                            <span className="text-xs font-semibold text-slate-400 ml-1">({activeSegment.data.percent ? activeSegment.data.percent.toFixed(1) : 0}%)</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    Chạm vào biểu đồ để xem chi tiết
                                </div>
                            )}
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
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{cat?.name || 'Chưa phân loại'}</p>
                                        <p className="text-xs text-slate-400 truncate">{txn.description}</p>
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

            {/* Floating Action Button (FAB) Menu */}
            {isFabMenuOpen && (
                <div className="fixed inset-0 z-30 flex" onClick={() => setIsFabMenuOpen(false)}>
                    <div className="absolute bottom-36 right-6 md:bottom-24 md:right-8 flex flex-col gap-3 items-end">
                        <button 
                            onClick={() => { setIsFabMenuOpen(false); setEditingTransaction(null); setIsModalOpen(true); }}
                            className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nhập thủ công</span>
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <PenSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </div>
                        </button>
                        <button 
                            onClick={() => { setIsFabMenuOpen(false); setIsAIChatOpen(true); }}
                            className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 transition-colors"
                        >
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Nhập bằng AI</span>
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                className={`fixed bottom-20 right-6 md:bottom-6 md:right-8 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${isFabMenuOpen ? 'bg-slate-600 rotate-45 scale-90' : 'bg-slate-800 dark:bg-cyan-600 hover:scale-105 active:scale-95'}`}
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modals */}
            <AIChatModal 
                isOpen={isAIChatOpen}
                onClose={() => setIsAIChatOpen(false)}
                user={user}
                categories={categories}
                aiMemories={aiMemories}
                wallets={wallets}
                selectedWalletId={selectedWalletIds.length === 1 ? selectedWalletIds[0] : null}
                onOpenContextWallet={() => setIsAIContextOpen(true)}
            />

            <AIContextModal
                isOpen={isAIContextOpen}
                onClose={() => setIsAIContextOpen(false)}
                user={user}
                categories={categories}
                aiMemories={aiMemories}
            />

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
                mode={walletModalMode}
                initialData={editingWallet}
                onSave={handleSaveWallet}
            />

            <ReorderWalletsModal
                isOpen={isReorderModalOpen}
                onClose={() => setIsReorderModalOpen(false)}
                wallets={walletBalances}
                onSave={async (newOrderIds) => {
                    try {
                        await updateWalletOrder(user.uid, newOrderIds);
                        setIsReorderModalOpen(false);
                    } catch (e) {
                        alert("Lỗi: " + e.message);
                    }
                }}
            />
        </div>
    );
};

export default DashboardPage;
