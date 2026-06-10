import React, { useState, useMemo } from 'react';
import {
    Sparkles, Loader2, Plus, Search, Filter, Calendar, X,
    ChevronDown, ArrowUpRight, ArrowDownRight, Pencil, Trash2,
    AlertTriangle, Check
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import {
    addTransaction, updateTransaction, deleteTransaction,
    learnFromCorrection, incrementMemoryUsage
} from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';

const TransactionsPage = ({ user, transactions, categories, aiMemories }) => {
    // AI Input
    const [aiInput, setAiInput] = useState('');
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState(null); // { type: 'success'|'error', message }

    // Filters
    const [filterMonth, setFilterMonth] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense'
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Edit inline
    const [editingTxnId, setEditingTxnId] = useState(null);
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editSubcategoryId, setEditSubcategoryId] = useState('');

    // Delete confirm
    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Manual add modal
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [manualForm, setManualForm] = useState({
        type: 'expense',
        amount: '',
        description: '',
        categoryId: '',
        subcategoryId: '',
        date: new Date().toISOString().split('T')[0],
    });

    // --- AI Input Handler ---
    const handleAISubmit = async () => {
        if (!aiInput.trim() || !user) return;
        setIsAIProcessing(true);
        setAiStatus(null);

        try {
            const result = await categorizeTransaction(aiInput, categories, aiMemories);

            await addTransaction(user.uid, {
                type: result.type,
                amount: result.amount,
                description: result.description,
                categoryId: result.categoryId,
                subcategoryId: result.subcategoryId,
                date: result.date,
                aiCategorized: result.aiCategorized,
            });

            // If used memory, increment usage
            if (result.memoryId) {
                await incrementMemoryUsage(user.uid, result.memoryId);
            }

            const cat = categories.find(c => c.id === result.categoryId);
            const sub = cat?.subcategories?.find(s => s.id === result.subcategoryId);
            const catLabel = cat ? `${cat.icon} ${cat.name}` : '❓';
            const subLabel = sub ? sub.name : 'Chưa phân loại';

            setAiStatus({
                type: 'success',
                message: `✅ Đã thêm: ${result.description} — ${formatCurrency(result.amount)} → ${catLabel} > ${subLabel}`,
            });
            setAiInput('');
        } catch (error) {
            setAiStatus({ type: 'error', message: `❌ ${error.message}` });
        } finally {
            setIsAIProcessing(false);
            // Auto-clear status after 5s
            setTimeout(() => setAiStatus(null), 5000);
        }
    };

    // --- Filter Logic ---
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        if (filterMonth) {
            result = result.filter(t => t.date?.startsWith(filterMonth));
        }
        if (filterType !== 'all') {
            result = result.filter(t => t.type === filterType);
        }
        if (filterCategory !== 'all') {
            result = result.filter(t => t.categoryId === filterCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => t.description?.toLowerCase().includes(q));
        }

        return result;
    }, [transactions, filterMonth, filterType, filterCategory, searchQuery]);

    // Group by date
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(txn => {
            const date = txn.date || 'unknown';
            if (!groups[date]) groups[date] = [];
            groups[date].push(txn);
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    }, [filteredTransactions]);

    // Monthly totals for filtered
    const filteredStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        return { income, expense };
    }, [filteredTransactions]);

    // --- Inline Edit: Change Category ---
    const startEdit = (txn) => {
        setEditingTxnId(txn.id);
        setEditCategoryId(txn.categoryId || '');
        setEditSubcategoryId(txn.subcategoryId || '');
    };

    const cancelEdit = () => {
        setEditingTxnId(null);
        setEditCategoryId('');
        setEditSubcategoryId('');
    };

    const saveEdit = async (txn) => {
        if (!user) return;
        try {
            await updateTransaction(user.uid, txn.id, {
                categoryId: editCategoryId,
                subcategoryId: editSubcategoryId,
            });

            // AI Learning: if the category changed, learn from the correction
            if (txn.categoryId !== editCategoryId || txn.subcategoryId !== editSubcategoryId) {
                await learnFromCorrection(user.uid, txn.description, editCategoryId, editSubcategoryId);
            }
        } catch (err) {
            console.error('Error updating transaction:', err);
        }
        cancelEdit();
    };

    // --- Delete ---
    const handleDelete = async () => {
        if (!user || !confirmState.data) return;
        setIsDeleting(true);
        try {
            await deleteTransaction(user.uid, confirmState.data);
        } catch (err) {
            console.error('Error deleting:', err);
        }
        setIsDeleting(false);
        setConfirmState({ isOpen: false, data: null });
    };

    // --- Manual Add ---
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        try {
            await addTransaction(user.uid, {
                ...manualForm,
                amount: parseFloat(manualForm.amount) || 0,
                aiCategorized: false,
            });
            setShowManualAdd(false);
            setManualForm({
                type: 'expense', amount: '', description: '',
                categoryId: '', subcategoryId: '',
                date: new Date().toISOString().split('T')[0],
            });
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    // --- Get category options by type ---
    const getCategoriesByType = (type) => categories.filter(c => c.type === type);
    const getSubcategories = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.subcategories || [];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Giao dịch</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Thu chi hằng ngày</p>
                </div>
                <button
                    onClick={() => setShowManualAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                >
                    <Plus className="w-4 h-4" /> Thêm thủ công
                </button>
            </div>

            {/* AI Input Bar */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAISubmit();
                            }
                        }}
                        placeholder="Vd: ăn sáng 50k, grab 30k, lương 15 triệu..."
                        className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                        disabled={isAIProcessing}
                    />
                    <button
                        onClick={handleAISubmit}
                        disabled={isAIProcessing || !aiInput.trim()}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        {isAIProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm'}
                    </button>
                </div>
                {aiStatus && (
                    <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                        aiStatus.type === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                        {aiStatus.message}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>

                {/* Type filter */}
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none"
                >
                    <option value="all">Tất cả</option>
                    <option value="expense">Chi tiêu</option>
                    <option value="income">Thu nhập</option>
                </select>

                {/* Category filter */}
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none max-w-[160px]"
                >
                    <option value="all">Mọi danh mục</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                </select>

                {/* Month filter */}
                <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none"
                />
                {filterMonth && (
                    <button onClick={() => setFilterMonth('')} className="text-slate-400 hover:text-rose-500 p-1">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/30 text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Thu nhập</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+{formatCurrency(filteredStats.income)}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 border border-rose-100 dark:border-rose-800/30 text-center">
                    <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Chi tiêu</p>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-300">-{formatCurrency(filteredStats.expense)}</p>
                </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-4">
                {groupedTransactions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 border-dashed">
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-slate-400 dark:text-slate-500 font-medium">Chưa có giao dịch nào</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Nhập "ăn sáng 50k" vào ô AI phía trên để bắt đầu!</p>
                    </div>
                ) : (
                    groupedTransactions.map(([date, txns]) => {
                        const dateObj = new Date(date + 'T00:00:00');
                        const dayTotal = txns.reduce((sum, t) => {
                            return sum + (t.type === 'expense' ? -t.amount : t.amount);
                        }, 0);

                        return (
                            <div key={date} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {/* Date Header */}
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                            {txns.length}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold ${dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                                    </span>
                                </div>

                                {/* Transactions */}
                                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {txns.map(txn => {
                                        const cat = categories.find(c => c.id === txn.categoryId);
                                        const sub = cat?.subcategories?.find(s => s.id === txn.subcategoryId);
                                        const isIncome = txn.type === 'income';
                                        const isEditing = editingTxnId === txn.id;

                                        return (
                                            <div key={txn.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                                                        {cat?.icon || '❓'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{txn.description}</p>
                                                        {isEditing ? (
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                <select
                                                                    value={editCategoryId}
                                                                    onChange={(e) => {
                                                                        setEditCategoryId(e.target.value);
                                                                        setEditSubcategoryId('');
                                                                    }}
                                                                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <option value="">Chọn danh mục</option>
                                                                    {getCategoriesByType(txn.type).map(c => (
                                                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                    ))}
                                                                </select>
                                                                {editCategoryId && (
                                                                    <select
                                                                        value={editSubcategoryId}
                                                                        onChange={(e) => setEditSubcategoryId(e.target.value)}
                                                                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-slate-700 dark:text-slate-300"
                                                                    >
                                                                        <option value="">Chọn mục con</option>
                                                                        {getSubcategories(editCategoryId).map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                                <button onClick={() => saveEdit(txn)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => startEdit(txn)}
                                                                className="text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 mt-0.5"
                                                            >
                                                                {cat ? `${cat.name}` : 'Chưa phân loại'} {sub ? `> ${sub.name}` : ''}
                                                                {txn.aiCategorized && <Sparkles className="w-3 h-3 text-amber-400" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                                        </span>
                                                        <button
                                                            onClick={() => setConfirmState({ isOpen: true, data: txn.id })}
                                                            className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Manual Add Modal */}
            {showManualAdd && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Thêm giao dịch</h3>
                            <button onClick={() => setShowManualAdd(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                            {/* Type Toggle */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setManualForm({ ...manualForm, type: 'expense', categoryId: '', subcategoryId: '' })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${manualForm.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                                >
                                    <ArrowDownRight className="w-4 h-4 inline mr-1" /> Chi tiêu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManualForm({ ...manualForm, type: 'income', categoryId: '', subcategoryId: '' })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${manualForm.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                                >
                                    <ArrowUpRight className="w-4 h-4 inline mr-1" /> Thu nhập
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô tả</label>
                                <input type="text" required value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số tiền</label>
                                <input type="number" required value={manualForm.amount} onChange={e => setManualForm({ ...manualForm, amount: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày</label>
                                <input type="date" required value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                                <select
                                    value={manualForm.categoryId}
                                    onChange={e => setManualForm({ ...manualForm, categoryId: e.target.value, subcategoryId: '' })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">Chọn danh mục...</option>
                                    {getCategoriesByType(manualForm.type).map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {manualForm.categoryId && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục con</label>
                                    <select
                                        value={manualForm.subcategoryId}
                                        onChange={e => setManualForm({ ...manualForm, subcategoryId: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Chọn mục con...</option>
                                        {getSubcategories(manualForm.categoryId).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all">
                                Lưu giao dịch
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, data: null })}
                onConfirm={handleDelete}
                title="Xóa giao dịch?"
                description="Bạn có chắc muốn xóa giao dịch này không?"
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
