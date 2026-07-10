import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Calendar, Pencil, Trash2, AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, X, Check, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { deleteTransaction, deleteMultipleTransactions, updateTransaction, processCorrections, updateDebt, getTransactionByDebtId } from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';
import TransactionModal from '../components/modals/TransactionModal';
import TransferFundsModal from '../components/modals/TransferFundsModal';
import DateRangeSelector from '../components/DateRangeSelector';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import LoanEditModal from '../components/modals/LoanEditModal';

const TransactionsPage = ({ user, userSettings, transactions, categories, wallets, debts }) => {
    // --- Filters ---
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });
    const [selectedWalletIds, setSelectedWalletIds] = useState(() => {
        try {
            const saved = localStorage.getItem('yoogi_selected_wallet_ids');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    React.useEffect(() => {
        localStorage.setItem('yoogi_selected_wallet_ids', JSON.stringify(selectedWalletIds));
    }, [selectedWalletIds]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Batch Delete State ---
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);

    // --- Loan Edit State ---
    const [isLoanEditOpen, setIsLoanEditOpen] = useState(false);
    const [editingLoanTxn, setEditingLoanTxn] = useState(null);

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
            let dateKey = t.date;
            if (dateKey && dateKey.includes('T')) {
                const d = new Date(dateKey);
                if (!isNaN(d.getTime())) {
                    dateKey = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                } else {
                    dateKey = dateKey.split('T')[0];
                }
            } else if (dateKey) {
                dateKey = dateKey.split('T')[0];
            } else {
                dateKey = 'Unknown';
            }
            if (!groups[dateKey]) groups[dateKey] = { date: dateKey, totalIncome: 0, totalExpense: 0, items: [] };
            groups[dateKey].items.push(t);
            if (t.type === 'income' || t.type === 'loan_repaid') groups[dateKey].totalIncome += t.amount;
            else if (t.type === 'expense' || t.type === 'loan_given') groups[dateKey].totalExpense += t.amount;
        });
        // Sort items within each group by time descending (newest first), fallback to createdAt
        const result = Object.values(groups);
        result.forEach(group => {
            group.items.sort((a, b) => {
                // Primary sort: time field (HH:mm) descending
                const timeA = a.time || '';
                const timeB = b.time || '';
                if (timeA && timeB) return timeB.localeCompare(timeA);
                if (timeB) return 1;
                if (timeA) return -1;
                // Fallback: createdAt descending
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            });
        });
        // Sort dates descending
        return result.sort((a, b) => b.date.localeCompare(a.date));
    }, [filteredTransactions, selectedWalletIds]);

    const summaryStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') income += (t.amount || 0);
            else if (t.type === 'expense') expense += (t.amount || 0);
        });
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    // --- Handlers ---
    const handleSaveTransaction = async (formData) => {
        if (!user || !editingTransaction) return;
        try {
            await processCorrections(user.uid, editingTransaction, formData);
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
            const txnToDelete = transactions.find(t => t.id === deleteModal.id);
            await deleteTransaction(user.uid, deleteModal.id, txnToDelete);
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
        setIsDeleting(false);
    };

    const handleDeleteFromModal = async (id) => {
        if (!user || !id) return;
        try {
            const txnToDelete = transactions.find(t => t.id === id);
            await deleteTransaction(user.uid, id, txnToDelete);
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    };

    const openEditModal = (e, txn) => {
        e.stopPropagation();
        if (txn.type === 'loan_given' || txn.type === 'loan_repaid' || txn.type === 'installment_repaid') {
            setEditingLoanTxn(txn);
            setIsLoanEditOpen(true);
            return;
        }
        setEditingTransaction(txn);
        if (txn.type === 'transfer') {
            setIsTransferModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    // --- Loan Edit Handlers ---
    const closeLoanEditModal = () => {
        setIsLoanEditOpen(false);
        setEditingLoanTxn(null);
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIds([]);
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredTransactions.length) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(filteredTransactions.map(t => t.id)); // Select all
        }
    };

    const handleBatchDelete = async () => {
        if (!user || selectedIds.length === 0) return;
        if (!window.confirm(`Xác nhận xóa ${selectedIds.length} giao dịch đã chọn? Hành động này không thể hoàn tác.`)) return;
        
        setIsBatchDeleting(true);
        try {
            await deleteMultipleTransactions(user.uid, selectedIds);
            setSelectedIds([]);
            setIsSelectMode(false);
        } catch (error) {
            alert('Lỗi khi xóa nhiều: ' + error.message);
        }
        setIsBatchDeleting(false);
    };

    return (
        <div className="space-y-6">
            {/* Header Title */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Filter className="w-6 h-6 text-indigo-500" />
                    Lịch sử giao dịch
                </h2>
                <div className="flex items-center gap-2">
                    {isSelectMode && (
                        <button 
                            onClick={handleSelectAll}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            {selectedIds.length === filteredTransactions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    )}
                    <button 
                        onClick={toggleSelectMode}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${isSelectMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                    >
                        {isSelectMode ? 'Hủy chọn' : 'Chế độ chọn'}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative md:sticky top-0 z-20">
                <div className="flex flex-col md:flex-row flex-wrap md:items-center justify-center gap-3">
                    <MultiSelectDropdown
                        placeholder="🏦 Tất cả ví"
                        options={wallets || []}
                        selectedIds={selectedWalletIds}
                        onChange={setSelectedWalletIds}
                        widthClass="w-full md:min-w-[160px] md:w-auto"
                    />

                    <div className="flex flex-col md:flex-row flex-wrap justify-center gap-3 w-full md:w-auto">
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
                            widthClass="w-full md:min-w-[180px] md:w-auto"
                        />

                        <MultiSelectDropdown
                            placeholder="Tất cả danh mục phụ"
                            isGrouped={true}
                            options={(() => {
                                const filtered = categories?.filter(c => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(c.id)) || [];
                                const expenseGroups = filtered.filter(c => c.type === 'expense').map(c => ({
                                    label: c.name,
                                    options: c.subcategories?.map(s => ({ id: s.id, name: s.name })) || []
                                })).filter(group => group.options.length > 0);
                                if (expenseGroups.length > 0) expenseGroups[0].superLabel = <span className="text-rose-600 dark:text-rose-400">CHI TIÊU</span>;

                                const incomeGroups = filtered.filter(c => c.type === 'income').map(c => ({
                                    label: c.name,
                                    options: c.subcategories?.map(s => ({ id: s.id, name: s.name })) || []
                                })).filter(group => group.options.length > 0);
                                if (incomeGroups.length > 0) incomeGroups[0].superLabel = <span className="text-emerald-600 dark:text-emerald-400">THU NHẬP</span>;

                                return [...expenseGroups, ...incomeGroups];
                            })()}
                            selectedIds={selectedSubcategoryIds}
                            onChange={setSelectedSubcategoryIds}
                            widthClass="w-full md:min-w-[160px] md:w-auto"
                        />
                    </div>
                    <div className="w-full md:w-auto flex justify-center">
                        <DateRangeSelector 
                            initialMode="month" 
                            onChange={(range) => setDateRange(range)} 
                            userSettings={userSettings}
                        />
                    </div>
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
                                <div className="text-base font-extrabold">
                                    {(() => {
                                        const net = group.totalIncome - group.totalExpense;
                                        return <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</span>;
                                    })()}
                                </div>
                            </div>
                            
                            {/* Group Items */}
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {group.items.map(txn => {
                                    const cat = categories.find(c => c.id === txn.categoryId);
                                    const wallet = wallets?.find(w => w.id === txn.walletId);
                                    const isIncome = txn.type === 'income' || txn.type === 'loan_repaid';
                                    const isExpense = txn.type === 'expense' || txn.type === 'loan_given';
                                    const isLoan = txn.type === 'loan_given' || txn.type === 'loan_repaid';

                                    return (
                                        <div 
                                            key={txn.id} 
                                            onClick={(e) => {
                                                if (isSelectMode) {
                                                    toggleSelection(txn.id);
                                                } else {
                                                    openEditModal(e, txn);
                                                }
                                            }} 
                                            className={`px-5 py-4 flex items-center gap-4 transition-colors group hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer`}
                                        >
                                            {/* Checkbox */}
                                            {isSelectMode && (
                                                <div className="flex-shrink-0 flex items-center justify-center mr-2">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.includes(txn.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                        {selectedIds.includes(txn.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : (isExpense ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800')}`}>
                                                {cat?.icon || (isLoan ? (txn.type === 'loan_given' ? '📤' : '📥') : '❓')}
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5">
                                                    {txn.type === 'transfer' ? `${wallets?.find(w => w.id === txn.walletId)?.name || '?'} ➝ ${wallets?.find(w => w.id === txn.transferTo)?.name || '?'}` 
                                                    : (txn.type === 'loan_given' ? `Cho mượn ( Ví: ${wallet?.name || '?'} )` 
                                                    : (txn.type === 'loan_repaid' ? `Nhận trả nợ ( Ví: ${wallet?.name || '?'} )`
                                                    : `${wallet?.name || 'Chưa phân ví'} • ${cat?.name || '❓ Chưa phân loại'} ${txn.subcategoryId && cat?.subcategories?.find(s => s.id === txn.subcategoryId) ? `> ${cat.subcategories.find(s => s.id === txn.subcategoryId).name}` : ''}`))}
                                                </p>
                                                <div className="flex flex-col gap-1 mt-0.5">
                                                    {txn.time && (
                                                        <div className="flex items-center">
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                                <Clock className="w-3 h-3" />
                                                                {txn.time}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {txn.description && (
                                                        <p className="font-medium text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                                                            {isLoan && txn.description ? txn.description.replace(/^(?:Cho )?.*?(?:mượn|trả nợ):\s*/, '') : txn.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right shrink-0">
                                                <p className={`font-bold text-base whitespace-nowrap flex items-center justify-end gap-1.5 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : (isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                                    <span className="flex-shrink-0 w-4 flex items-center justify-center">
                                                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : (isExpense ? <ArrowDownRight className="w-4 h-4" /> : '⇄')}
                                                    </span>
                                                    <span className="tabular-nums">{formatCurrency(txn.amount)}</span>
                                                </p>
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

            {/* Batch Delete Floating Action Bar */}
            {isSelectMode && selectedIds.length > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <span className="font-bold whitespace-nowrap">Đã chọn {selectedIds.length}</span>
                    <button 
                        onClick={handleBatchDelete}
                        disabled={isBatchDeleting}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                    >
                        {isBatchDeleting ? 'Đang xóa...' : (
                            <>
                                <Trash2 className="w-4 h-4" /> Xóa
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Loan Edit Modal */}
            <LoanEditModal
                isOpen={isLoanEditOpen}
                onClose={closeLoanEditModal}
                transaction={editingLoanTxn}
                user={user}
                wallets={wallets}
                debts={debts}
                onDeleteRequest={(e, id) => openDeleteModal(e, id)}
            />
        </div>
    );
};

export default TransactionsPage;
