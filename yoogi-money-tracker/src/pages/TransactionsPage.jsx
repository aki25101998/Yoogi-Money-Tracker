import React, { useState, useMemo } from 'react';
import { Filter, Calendar, Pencil, Trash2, AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { deleteTransaction, updateTransaction } from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';
import TransactionModal from '../components/modals/TransactionModal';
import TransferFundsModal from '../components/modals/TransferFundsModal';
import DateRangeSelector from '../components/DateRangeSelector';

const TransactionsPage = ({ user, transactions, categories, wallets }) => {
    // --- Filters ---
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });
    const [selectedWalletId, setSelectedWalletId] = useState('all');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Filter Logic ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (!t.date) return false;
            
            if (dateRange.start && t.date < dateRange.start) return false;
            if (dateRange.end && t.date > dateRange.end) return false;
            
            if (selectedWalletId !== 'all') {
                if (t.type === 'transfer') {
                    if (t.walletId !== selectedWalletId && t.transferTo !== selectedWalletId) return false;
                } else {
                    if (t.walletId !== selectedWalletId) return false;
                }
            }

            if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;
            if (selectedSubcategoryId !== 'all' && t.subcategoryId !== selectedSubcategoryId) return false;

            return true;
        });
    }, [transactions, dateRange, selectedWalletId, selectedCategoryId, selectedSubcategoryId]);

    // Group by Date for better UI
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = { date: t.date, totalIncome: 0, totalExpense: 0, items: [] };
            groups[t.date].items.push(t);
            if (t.type === 'income') groups[t.date].totalIncome += t.amount;
            else if (t.type === 'expense') groups[t.date].totalExpense += t.amount;
            else if (t.type === 'transfer' && selectedWalletId !== 'all') {
                if (t.transferTo === selectedWalletId) groups[t.date].totalIncome += t.amount;
                if (t.walletId === selectedWalletId) groups[t.date].totalExpense += t.amount;
            }
        });
        // Sort dates descending
        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [filteredTransactions]);

    const summaryStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') income += (t.amount || 0);
            else if (t.type === 'expense') expense += (t.amount || 0);
            else if (t.type === 'transfer' && selectedWalletId !== 'all') {
                if (t.transferTo === selectedWalletId) income += (t.amount || 0);
                if (t.walletId === selectedWalletId) expense += (t.amount || 0);
            }
        });
        return { income, expense, balance: income - expense };
    }, [filteredTransactions, selectedWalletId]);

    // --- Handlers ---
    const handleSaveTransaction = async (formData) => {
        if (!user || !editingTransaction) return;
        try {
            await updateTransaction(user.uid, editingTransaction.id, formData);
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleDelete = async () => {
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

    const handleDeleteFromModal = async (id) => {
        if (!user || !id) return;
        try {
            await deleteTransaction(user.uid, id);
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    };

    const openEditModal = (e, txn) => {
        e.stopPropagation();
        setEditingTransaction(txn);
        if (txn.type === 'transfer') {
            setIsTransferModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

    return (
        <div className="space-y-6">
            {/* Header Title */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-center items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Filter className="w-6 h-6 text-indigo-500" />
                    Lịch sử giao dịch
                </h2>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="relative group">
                        <select
                            value={selectedWalletId}
                            onChange={(e) => setSelectedWalletId(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        >
                            <option value="all">🏦 Tất cả ví</option>
                            {wallets?.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.icon} {w.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative group">
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => {
                                    setSelectedCategoryId(e.target.value);
                                    setSelectedSubcategoryId('all');
                                }}
                                className="appearance-none pl-4 pr-10 py-2 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[160px] max-w-[200px] truncate"
                            >
                                <option value="all">📂 Tất cả danh mục</option>
                                <optgroup label="Chi tiêu">
                                    {categories?.filter(c => c.type === 'expense').map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Thu nhập">
                                    {categories?.filter(c => c.type === 'income').map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative group">
                            <select
                                value={selectedSubcategoryId}
                                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[140px] max-w-[180px] truncate"
                            >
                                <option value="all">Tất cả mục con</option>
                                {selectedCategoryId !== 'all' && categories?.find(c => c.id === selectedCategoryId)?.subcategories?.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        </div>
                        <DateRangeSelector 
                            initialMode="month" 
                            onChange={(range) => setDateRange(range)} 
                        />
                    </div>
            </div>

            {/* Summary Banner */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center sm:block sm:text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase sm:mb-1">Thu nhập</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(summaryStats.income)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center sm:block sm:text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase sm:mb-1">Chi tiêu</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(summaryStats.expense)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center sm:block sm:text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase sm:mb-1">Cân đối</p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(summaryStats.balance)}</p>
                </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-6">
                {groupedTransactions.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Không có giao dịch nào trong khoảng thời gian này.</p>
                    </div>
                ) : (
                    groupedTransactions.map(group => (
                        <div key={group.date} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                    {new Date(group.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="text-sm font-bold">
                                    {group.totalIncome > 0 && <span className="text-emerald-600 mx-1">+{formatCurrency(group.totalIncome)}</span>}
                                    {group.totalExpense > 0 && <span className="text-rose-600 mx-1">-{formatCurrency(group.totalExpense)}</span>}
                                </div>
                            </div>
                            
                            {/* Group Items */}
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {group.items.map(txn => {
                                    const cat = categories.find(c => c.id === txn.categoryId);
                                    const wallet = wallets?.find(w => w.id === txn.walletId);
                                    const isIncome = txn.type === 'income' || (txn.type === 'transfer' && selectedWalletId !== 'all' && txn.transferTo === selectedWalletId);
                                    const isExpense = txn.type === 'expense' || (txn.type === 'transfer' && selectedWalletId !== 'all' && txn.walletId === selectedWalletId);

                                    return (
                                        <div key={txn.id} onClick={(e) => openEditModal(e, txn)} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : (isExpense ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800')}`}>
                                                {cat?.icon || '❓'}
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5">
                                                    {txn.type === 'transfer' ? `Đến: ${wallets?.find(w => w.id === txn.transferTo)?.name || '?'}` : (wallet?.name || 'Chưa phân ví')} • {cat?.name || '❓ Chưa phân loại'} {txn.subcategoryId && cat?.subcategories?.find(s => s.id === txn.subcategoryId) ? `> ${cat.subcategories.find(s => s.id === txn.subcategoryId).name}` : ''}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-slate-500 dark:text-slate-400 truncate text-sm">{txn.description}</p>
                                                </div>
                                            </div>

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className={`font-bold text-base whitespace-nowrap flex items-center justify-end gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : (isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-rose-500')}`}>
                                                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : (isExpense ? <ArrowDownRight className="w-4 h-4" /> : '⇄')}
                                                        {formatCurrency(txn.amount)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => openDeleteModal(e, txn.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-lg transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                onDelete={handleDeleteFromModal}
                categories={categories}
                wallets={wallets}
                initialData={editingTransaction}
            />

            {/* Transfer Edit Modal */}
            <TransferFundsModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSave={handleSaveTransaction}
                onDelete={handleDeleteFromModal}
                wallets={wallets}
                initialData={editingTransaction}
            />

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Xóa giao dịch này?"
                description="Hành động này không thể hoàn tác."
                confirmText="Xóa"
                confirmVariant="danger"
                isProcessing={isDeleting}
                Icon={AlertTriangle}
                iconColorClass="text-rose-600"
                iconBgClass="bg-rose-100"
            />
        </div>
    );
};

export default TransactionsPage;
