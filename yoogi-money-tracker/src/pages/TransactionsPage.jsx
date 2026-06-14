import React, { useState, useMemo } from 'react';
import { Filter, Calendar, Pencil, Trash2, AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { deleteTransaction, updateTransaction } from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';
import TransactionModal from '../components/modals/TransactionModal';
import TransferFundsModal from '../components/modals/TransferFundsModal';
import DateRangeSelector from '../components/DateRangeSelector';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const TransactionsPage = ({ user, transactions, categories, wallets }) => {
    // --- Filters ---
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });
    const [selectedWalletIds, setSelectedWalletIds] = useState([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);

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
            
            if (selectedWalletIds.length > 0) {
                if (t.type === 'transfer') {
                    if (!selectedWalletIds.includes(t.walletId) && !selectedWalletIds.includes(t.transferTo)) return false;
                } else {
                    if (!selectedWalletIds.includes(t.walletId)) return false;
                }
            }

            if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) return false;
            if (selectedSubcategoryIds.length > 0 && !selectedSubcategoryIds.includes(t.subcategoryId)) return false;

            return true;
        });
    }, [transactions, dateRange, selectedWalletIds, selectedCategoryIds, selectedSubcategoryIds]);

    // Group by Date for better UI
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = { date: t.date, totalIncome: 0, totalExpense: 0, items: [] };
            groups[t.date].items.push(t);
            if (t.type === 'income') groups[t.date].totalIncome += t.amount;
            else if (t.type === 'expense') groups[t.date].totalExpense += t.amount;
            else if (t.type === 'transfer' && selectedWalletIds.length > 0) {
                if (selectedWalletIds.includes(t.transferTo)) groups[t.date].totalIncome += t.amount;
                if (selectedWalletIds.includes(t.walletId)) groups[t.date].totalExpense += t.amount;
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
            else if (t.type === 'transfer' && selectedWalletIds.length > 0) {
                if (selectedWalletIds.includes(t.transferTo)) income += (t.amount || 0);
                if (selectedWalletIds.includes(t.walletId)) expense += (t.amount || 0);
            }
        });
        return { income, expense, balance: income - expense };
    }, [filteredTransactions, selectedWalletIds]);

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
                <div className="flex flex-wrap items-center gap-3">
                    <MultiSelectDropdown
                        placeholder="🏦 Tất cả ví"
                        options={wallets || []}
                        selectedIds={selectedWalletIds}
                        onChange={setSelectedWalletIds}
                        widthClass="min-w-[160px]"
                    />

                    <div className="flex flex-wrap gap-3">
                        <MultiSelectDropdown
                            placeholder="📂 Tất cả danh mục chính"
                            isGrouped={true}
                            options={[
                                { label: 'Chi tiêu', options: categories?.filter(c => c.type === 'expense') || [] },
                                { label: 'Thu nhập', options: categories?.filter(c => c.type === 'income') || [] }
                            ]}
                            selectedIds={selectedCategoryIds}
                            onChange={(ids) => {
                                setSelectedCategoryIds(ids);
                                setSelectedSubcategoryIds([]);
                            }}
                            widthClass="min-w-[180px]"
                        />

                        <MultiSelectDropdown
                            placeholder="Tất cả danh mục phụ"
                            options={categories
                                ?.filter(c => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(c.id))
                                .flatMap(c => c.subcategories || [])
                                .map(s => ({ id: s.id, name: s.name })) || []}
                            selectedIds={selectedSubcategoryIds}
                            onChange={setSelectedSubcategoryIds}
                            widthClass="min-w-[160px]"
                        />
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
                                    const isIncome = txn.type === 'income' || (txn.type === 'transfer' && selectedWalletIds.length > 0 && selectedWalletIds.includes(txn.transferTo));
                                    const isExpense = txn.type === 'expense' || (txn.type === 'transfer' && selectedWalletIds.length > 0 && selectedWalletIds.includes(txn.walletId));

                                    return (
                                        <div key={txn.id} onClick={(e) => openEditModal(e, txn)} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : (isExpense ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800')}`}>
                                                {cat?.icon || '❓'}
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5">
                                                    {txn.type === 'transfer' ? `${wallets?.find(w => w.id === txn.walletId)?.name || '?'} ➝ ${wallets?.find(w => w.id === txn.transferTo)?.name || '?'}` : (wallet?.name || 'Chưa phân ví')} • {cat?.name || '❓ Chưa phân loại'} {txn.subcategoryId && cat?.subcategories?.find(s => s.id === txn.subcategoryId) ? `> ${cat.subcategories.find(s => s.id === txn.subcategoryId).name}` : ''}
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
