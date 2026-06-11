import React, { useState, useMemo } from 'react';
import { Filter, Calendar, Pencil, Trash2, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { deleteTransaction, updateTransaction } from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';
import TransactionModal from '../components/modals/TransactionModal';

const TransactionsPage = ({ user, transactions, categories, wallets }) => {
    // --- Filters ---
    const [timeFilter, setTimeFilter] = useState('month'); // today, week, month, year, custom
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Date Helpers ---
    const getStartOfWeek = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(date.setDate(diff)).setHours(0,0,0,0);
    };

    // --- Filter Logic ---
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentYear = `${now.getFullYear()}`;
        const startOfWeek = getStartOfWeek(now);

        return transactions.filter(t => {
            if (!t.date) return false;
            const tDate = new Date(t.date);

            switch (timeFilter) {
                case 'today':
                    return t.date === todayStr;
                case 'week':
                    return tDate.getTime() >= startOfWeek && tDate.getTime() <= now.getTime();
                case 'month':
                    return t.date.startsWith(currentMonth);
                case 'year':
                    return t.date.startsWith(currentYear);
                case 'custom':
                    if (customDateRange.start && t.date < customDateRange.start) return false;
                    if (customDateRange.end && t.date > customDateRange.end) return false;
                    return true;
                default:
                    return true;
            }
        });
    }, [transactions, timeFilter, customDateRange]);

    // Group by Date for better UI
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = { date: t.date, totalIncome: 0, totalExpense: 0, items: [] };
            groups[t.date].items.push(t);
            if (t.type === 'income') groups[t.date].totalIncome += t.amount;
            else groups[t.date].totalExpense += t.amount;
        });
        // Sort dates descending
        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [filteredTransactions]);

    const summaryStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    // --- Handlers ---
    const handleSaveTransaction = async (formData) => {
        if (!user || !editingTransaction) return;
        try {
            await updateTransaction(user.uid, editingTransaction.id, formData);
            setIsModalOpen(false);
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
            setEditingTransaction(null);
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    };

    const openEditModal = (e, txn) => {
        e.stopPropagation();
        setEditingTransaction(txn);
        setIsModalOpen(true);
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

    return (
        <div className="space-y-6">
            {/* Header & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Filter className="w-5 h-5 text-indigo-500" />
                            Lịch sử Giao dịch
                        </h2>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {['today', 'week', 'month', 'year', 'custom'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    timeFilter === filter 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {filter === 'today' && 'Hôm nay'}
                                {filter === 'week' && 'Tuần này'}
                                {filter === 'month' && 'Tháng này'}
                                {filter === 'year' && 'Năm nay'}
                                {filter === 'custom' && 'Tùy chỉnh'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Date Range Picker */}
                {timeFilter === 'custom' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Từ:</span>
                            <input type="date" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Đến:</span>
                            <input type="date" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Thu nhập</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(summaryStats.income)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Chi tiêu</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(summaryStats.expense)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cân đối</p>
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
                                    const isIncome = txn.type === 'income';

                                    return (
                                        <div key={txn.id} onClick={(e) => openEditModal(e, txn)} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                                                {cat?.icon || '❓'}
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate text-base">{txn.description}</p>
                                                    {txn.aiCategorized && (
                                                        <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {wallet?.icon} {wallet?.name || 'Chưa phân ví'} • {cat?.name || '❓ Chưa phân loại'}
                                                </p>
                                            </div>

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className={`font-bold text-lg whitespace-nowrap flex items-center justify-end gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
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
