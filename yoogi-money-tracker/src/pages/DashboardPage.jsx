import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
    Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
    PieChart as PieChartIcon, Sparkles, Loader2, Plus, Pencil,
    Filter, Calendar, ChevronDown, Check, Info, Trash2, AlertTriangle, Clock,
    RotateCcw, ChevronUp, TrendingUp, TrendingDown, Target, ShieldCheck, AlertCircle, Lightbulb
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import AIFinancialAnalysis from '../components/dashboard/AIFinancialAnalysis';
import DashboardChart from '../components/dashboard/DashboardChart';
import NetChangeSummary from '../components/dashboard/NetChangeSummary';
import BudgetProgressWidget from '../components/dashboard/BudgetProgressWidget';
import RecentTransactionsList from '../components/dashboard/RecentTransactionsList';
import { addTransaction, incrementMemoryUsage, updateWalletOrder, addWallet, updateWallet, updateTransaction, processCorrections, deleteTransaction } from '../utils/supabaseHelpers';
import { supabase } from '../config/supabase';
import DateRangeSelector from '../components/DateRangeSelector';
import { Bot, PenSquare } from 'lucide-react';

const TransactionModal = lazy(() => import('../components/modals/TransactionModal'));
const WalletModal = lazy(() => import('../components/modals/WalletModal'));
const ReorderWalletsModal = lazy(() => import('../components/modals/ReorderWalletsModal'));
const TransferFundsModal = lazy(() => import('../components/modals/TransferFundsModal'));
const AIContextModal = lazy(() => import('../components/modals/AIContextModal'));
const CategoryTransactionsModal = lazy(() => import('../components/modals/CategoryTransactionsModal'));
const ConfirmModal = lazy(() => import('../components/modals/ConfirmModal'));


import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import SortableWalletCard from '../components/dashboard/SortableWalletCard';


const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

const DashboardPage = ({ user, userSettings, transactions, categories, aiMemories, wallets, recurringTransactions, payers, budgetSettings, budgetPortfolios, onNavigate }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- State ---
    const [selectedWalletIds, setSelectedWalletIds] = useState(() => {
        try {
            const saved = localStorage.getItem('yoogi_selected_wallet_ids');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('yoogi_selected_wallet_ids', JSON.stringify(selectedWalletIds));
    }, [selectedWalletIds]);
    
    // Validate selectedWalletIds against loaded wallets to remove old Firebase IDs
    useEffect(() => {
        if (wallets && wallets.length > 0 && selectedWalletIds.length > 0) {
            const validIds = selectedWalletIds.filter(id => wallets.some(w => w.id === id));
            if (validIds.length !== selectedWalletIds.length) {
                setSelectedWalletIds(validIds);
            }
        }
    }, [wallets, selectedWalletIds]);
    // UI States
    const [localWallets, setLocalWallets] = useState([]);
    useEffect(() => {
        setLocalWallets(wallets || []);
    }, [wallets]);
    
    const [isAIContextOpen, setIsAIContextOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const [walletModalMode, setWalletModalMode] = useState('add');
    const [editingWallet, setEditingWallet] = useState(null);

    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'
    const [selectedCategoryForModal, setSelectedCategoryForModal] = useState(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localWallets.findIndex(w => w.id === active.id);
            const newIndex = localWallets.findIndex(w => w.id === over.id);
            const newWallets = arrayMove(localWallets, oldIndex, newIndex);
            
            // Eagerly update local state for smooth UX
            setLocalWallets(newWallets);
            
            try {
                await updateWalletOrder(user.uid, newWallets.map(w => w.id));
            } catch (error) {
                console.error(error);
                // Revert on error
                setLocalWallets(wallets || []);
            }
        }
    };

    const handleSaveWallet = async (formData) => {
        if (!user) return;
        try {
            if (walletModalMode === 'edit' && editingWallet) {
                
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
    const {
        walletBalances,
        totalBalance,
        filteredTransactions,
        summaryStats,
        pieChartData,
        categoryTransactions,
        recentTransactions,
        budgetTransactions
    } = useDashboardStats({
        transactions,
        localWallets,
        selectedWalletIds,
        dateRange,
        categories,
        chartType,
        selectedCategoryForModal
    });

    // --- Handlers ---

    const handleSaveTransaction = async (formData) => {
        if (!user) return;
        try {
            if (editingTransaction) {
                
                await processCorrections(user.uid, editingTransaction, formData);
                await updateTransaction(user.uid, editingTransaction.id, formData);
            } else {
                await addTransaction(user.uid, { ...formData, aiCategorized: false });
            }
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!user) return;
        try {
            
            await deleteTransaction(user.uid, transactionId);
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi khi xóa: ' + err.message);
        }
    };

    const handleQuickDelete = async () => {
        if (!user || !deleteModal.id) return;
        setIsDeleting(true);
        try {
            
            await deleteTransaction(user.uid, deleteModal.id);
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
        setIsDeleting(false);
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };



    return (
        <div className="space-y-6 pb-20 relative min-h-screen">
            {/* 1. Dashboard Header - (Old AI Bar removed) */}

            {/* 2. Total Balance & Wallets */}
            <div className="relative bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-slate-950 dark:to-slate-900 rounded-[32px] p-8 mb-6 shadow-[0_8px_30px_rgb(16,185,129,0.3)] dark:shadow-2xl border border-emerald-300/50 dark:border-slate-800 overflow-hidden mt-2">
                {/* Glassmorphism shine overlay */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 dark:from-white/10 to-transparent opacity-60 dark:opacity-30 pointer-events-none"></div>
                
                {/* Decorative glowing orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 dark:bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-800/20 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/50 mb-3 backdrop-blur-md shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white dark:text-emerald-400" />
                        <span className="text-xs font-bold text-white dark:text-slate-300 uppercase tracking-widest">Tổng số dư</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md pb-1">
                        {formatCurrency(totalBalance)}
                    </h1>
                </div>
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
                        userSettings={userSettings}
                    />
                </div>

                {/* Net Change Summary */}
                <NetChangeSummary summaryStats={summaryStats} />
            </div>

            {/* AI Financial Analysis Section */}
            <AIFinancialAnalysis 
                filteredTransactions={filteredTransactions} 
                categories={categories} 
                dateRange={dateRange} 
                totalBalance={totalBalance} 
                budgetSettings={budgetSettings}
                budgetPortfolios={budgetPortfolios}
            />

            {/* Ngân quỹ tự động (Budgets) */}
            <BudgetProgressWidget
                transactions={budgetTransactions}
                categories={categories}
                budgetSettings={budgetSettings}
                budgetPortfolios={budgetPortfolios}
                dateRange={dateRange}
                onEditTransaction={(txn) => {
                    setEditingTransaction(txn);
                    if (txn.type === 'transfer') setIsTransferModalOpen(true);
                    else setIsModalOpen(true);
                }}
                onDeleteTransaction={(txnId) => openDeleteModal({ stopPropagation: () => {} }, txnId)}
            />

            {/* 4. Chart Toggle & Donut Chart */}
            <DashboardChart 
                chartType={chartType} 
                setChartType={setChartType} 
                pieChartData={pieChartData} 
                summaryStats={summaryStats} 
                setSelectedCategoryForModal={setSelectedCategoryForModal} 
            />

            {/* 6. Recent Transactions */}
            <RecentTransactionsList 
                recentTransactions={recentTransactions} 
                categories={categories} 
                wallets={wallets} 
                setEditingTransaction={setEditingTransaction} 
                setIsTransferModalOpen={setIsTransferModalOpen} 
                setIsModalOpen={setIsModalOpen} 
                openDeleteModal={openDeleteModal} 
            />

            {/* Modals */}
            <Suspense fallback={null}>
                {isAIContextOpen && (
                    <AIContextModal
                        isOpen={isAIContextOpen}
                        onClose={() => setIsAIContextOpen(false)}
                        user={user}
                        categories={categories}
                        aiMemories={aiMemories}
                    />
                )}

                {isModalOpen && (
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
                )}

                {isTransferModalOpen && (
                    <TransferFundsModal
                        isOpen={isTransferModalOpen}
                        onClose={() => setIsTransferModalOpen(false)}
                        wallets={wallets}
                        onSave={handleSaveTransaction}
                        onDelete={handleDeleteTransaction}
                        initialData={editingTransaction}
                    />
                )}

                {isWalletModalOpen && (
                    <WalletModal
                        isOpen={isWalletModalOpen}
                        onClose={() => setIsWalletModalOpen(false)}
                        mode={walletModalMode}
                        initialData={walletModalMode === 'edit' ? editingWallet : null}
                        onSave={handleSaveWallet}
                    />
                )}

                {isReorderModalOpen && (
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
                )}

                {!!selectedCategoryForModal && (
                    <CategoryTransactionsModal
                        isOpen={!!selectedCategoryForModal}
                        onClose={() => setSelectedCategoryForModal(null)}
                        category={selectedCategoryForModal}
                        transactions={categoryTransactions}
                        categories={categories}
                        onEditTransaction={(txn) => {
                            setEditingTransaction(txn);
                            setIsModalOpen(true);
                        }}
                        onDeleteTransaction={(txnId) => {
                            openDeleteModal({ stopPropagation: () => {} }, txnId);
                        }}
                    />
                )}

                {deleteModal.isOpen && (
                    <ConfirmModal
                        isOpen={deleteModal.isOpen}
                        onClose={() => setDeleteModal({ isOpen: false, id: null })}
                        onConfirm={handleQuickDelete}
                        title="Xóa giao dịch này?"
                        description="Hành động này không thể hoàn tác."
                        confirmText="Xóa"
                        confirmVariant="danger"
                        isProcessing={isDeleting}
                        Icon={AlertTriangle}
                        iconColorClass="text-rose-600"
                        iconBgClass="bg-rose-100"
                    />
                )}
            </Suspense>
        </div>
    );
};

export default DashboardPage;
