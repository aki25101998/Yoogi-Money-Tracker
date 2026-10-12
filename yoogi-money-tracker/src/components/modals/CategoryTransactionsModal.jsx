import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Sparkles, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CategoryTransactionsModal = ({ isOpen, onClose, category, transactions = [], categories = [], onEditTransaction, onDeleteTransaction }) => {
    if (!isOpen || !category) return null;

    const totalAmount = useMemo(() => {
        return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [transactions]);

    const isIncome = category.type === 'income' || transactions.some(t => t.type === 'income');

    const subCategoryList = useMemo(() => {
        const fullCategory = categories?.find(c => c.id === category?.id);
        const map = {};

        transactions.forEach(txn => {
            let name = 'Khoản chi chung';
            let icon = category.icon || '📁';
            let id = 'main';

            if (txn.subcategoryId && fullCategory?.subcategories) {
                const subCat = fullCategory.subcategories.find(s => s.id === txn.subcategoryId);
                if (subCat) {
                    name = subCat.name;
                    icon = subCat.icon || icon;
                    id = subCat.id;
                }
            }

            if (!map[id]) {
                map[id] = { id, name, icon, amount: 0, count: 0 };
            }
            map[id].amount += (txn.amount || 0);
            map[id].count += 1;
        });

        const list = Object.values(map);
        // Only show subcategory breakdown if there is at least one specific subcategory
        const hasSpecificSub = list.some(item => item.id !== 'main');
        if (!hasSpecificSub && list.length <= 1) return [];

        return list.sort((a, b) => b.amount - a.amount);
    }, [transactions, categories, category]);

    const getTransactionIcon = (txn) => {
        if (txn.subcategoryId) {
            const fullCategory = categories?.find(c => c.id === category?.id);
            const sub = fullCategory?.subcategories?.find(s => s.id === txn.subcategoryId);
            if (sub?.icon) return sub.icon;
        }
        return category.icon || '📁';
    };

    const themeColors = isIncome
        ? {
            badgeBg: 'bg-emerald-100/80 dark:bg-emerald-900/50',
            badgeText: 'text-emerald-700 dark:text-emerald-300',
            iconBox: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400',
            amountText: 'text-emerald-600 dark:text-emerald-400',
            barGradient: 'from-emerald-500 to-teal-500',
            rowIconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40'
        }
        : {
            badgeBg: 'bg-rose-100/80 dark:bg-rose-900/50',
            badgeText: 'text-rose-700 dark:text-rose-300',
            iconBox: 'bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-950/60 dark:to-amber-950/60 border-rose-200/50 dark:border-rose-800/40 text-rose-600 dark:text-rose-400',
            amountText: 'text-rose-600 dark:text-rose-400',
            barGradient: 'from-rose-500 to-amber-500',
            rowIconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/40'
        };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border ${themeColors.iconBox}`}>
                            {category.icon || '📁'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{category.name}</h2>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${themeColors.badgeBg} ${themeColors.badgeText}`}>
                                    {transactions.length} giao dịch
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Tổng: <span className={`font-extrabold ${themeColors.amountText}`}>{formatCurrency(totalAmount)}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X className="w-6 h-6 pointer-events-none" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4">
                    {/* 1. Thống kê theo danh mục phụ */}
                    {subCategoryList.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-rose-500 pointer-events-none" />
                                    Chi tiết danh mục phụ ({subCategoryList.length})
                                </h3>
                                <span className="text-xs font-medium text-slate-400">
                                    {totalAmount > 0 ? 'Tỷ trọng %' : ''}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {subCategoryList.map((sub, index) => {
                                    const percent = totalAmount > 0 ? ((sub.amount / totalAmount) * 100) : 0;
                                    const formattedPercent = percent.toFixed(1);

                                    return (
                                        <div key={index} className="space-y-1.5 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-base select-none">{sub.icon}</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {sub.name}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        ({sub.count} giao dịch)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`font-bold ${themeColors.amountText}`}>
                                                        {formatCurrency(sub.amount)}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded min-w-[45px] text-right">
                                                        {formattedPercent}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full bg-gradient-to-r ${themeColors.barGradient} rounded-full transition-all duration-500`}
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 2. Danh sách các giao dịch */}
                    <div className="space-y-2">
                        <div className="px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Danh sách giao dịch ({transactions.length})
                            </h3>
                        </div>

                        {transactions.length === 0 ? (
                            <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                                <div className={`w-12 h-12 mx-auto rounded-2xl ${themeColors.rowIconBg} flex items-center justify-center text-xl`}>
                                    {category.icon || '📁'}
                                </div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Không có giao dịch nào trong danh mục này
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                {transactions.map(txn => {
                                    const txnIsIncome = txn.type === 'income';
                                    const formattedDate = txn.date ? new Date(txn.date).toLocaleDateString('vi-VN') : '';
                                    const txnIcon = getTransactionIcon(txn);

                                    return (
                                        <div 
                                            key={txn.id} 
                                            className="p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group" 
                                            onClick={() => onEditTransaction && onEditTransaction(txn)}
                                        >
                                            {/* Category Icon */}
                                            <div className={`w-10 h-10 rounded-xl ${themeColors.rowIconBg} flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                                                {txnIcon}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                    {txn.description || category.name}
                                                </p>
                                                {formattedDate && (
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {formattedDate}{txn.time ? ` • ${txn.time}` : ''}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-sm font-bold flex items-center gap-0.5 ${txnIsIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {txnIsIncome ? <ArrowUpRight className="w-3.5 h-3.5 pointer-events-none" /> : <ArrowDownRight className="w-3.5 h-3.5 pointer-events-none" />}
                                                    {txnIsIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                                </span>

                                                {onDeleteTransaction && (
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteTransaction(txn.id);
                                                        }} 
                                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                                                        title="Xóa giao dịch"
                                                    >
                                                        <Trash2 className="w-4 h-4 pointer-events-none" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CategoryTransactionsModal;
