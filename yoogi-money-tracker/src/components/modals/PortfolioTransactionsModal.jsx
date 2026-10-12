import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, PieChart, Sparkles, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PortfolioTransactionsModal = ({ isOpen, onClose, portfolio, transactions = [], categories = [], onEditTransaction, onDeleteTransaction }) => {
    if (!isOpen || !portfolio) return null;

    const totalAmount = useMemo(() => {
        return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [transactions]);

    // Group transactions by parent category and then by subcategory
    const categoryList = useMemo(() => {
        const groupedData = transactions.reduce((acc, txn) => {
            let parentCat = null;
            let subCat = null;

            if (txn.subcategoryId) {
                for (const c of categories) {
                    if (c.subcategories && c.subcategories.some(s => s.id === txn.subcategoryId)) {
                        subCat = c.subcategories.find(s => s.id === txn.subcategoryId);
                        parentCat = c;
                        break;
                    }
                }
            }
            
            if (!parentCat) {
                parentCat = categories.find(c => c.id === txn.categoryId);
            }

            const parentId = parentCat ? parentCat.id : 'other';
            const parentName = parentCat ? parentCat.name : 'Khác';
            const parentIcon = parentCat ? parentCat.icon : '📁';

            if (!acc[parentId]) {
                acc[parentId] = {
                    id: parentId,
                    name: parentName,
                    icon: parentIcon,
                    amount: 0,
                    count: 0,
                    subItems: []
                };
            }

            acc[parentId].amount += (txn.amount || 0);
            acc[parentId].count += 1;

            if (subCat) {
                let existingSub = acc[parentId].subItems.find(s => s.id === subCat.id);
                if (!existingSub) {
                    existingSub = { id: subCat.id, name: subCat.name, icon: subCat.icon || parentIcon, amount: 0, count: 0, isSub: true };
                    acc[parentId].subItems.push(existingSub);
                }
                existingSub.amount += (txn.amount || 0);
                existingSub.count += 1;
            } else {
                let existingMain = acc[parentId].subItems.find(s => !s.isSub);
                if (!existingMain) {
                    existingMain = { id: 'main', name: 'Chung', icon: parentIcon, amount: 0, count: 0, isSub: false };
                    acc[parentId].subItems.push(existingMain);
                }
                existingMain.amount += (txn.amount || 0);
                existingMain.count += 1;
            }

            return acc;
        }, {});

        return Object.values(groupedData)
            .map(parent => {
                if (parent.subItems.length === 1 && !parent.subItems[0].isSub) {
                    parent.subItems = [];
                }
                parent.subItems.sort((a, b) => b.amount - a.amount);
                return parent;
            })
            .sort((a, b) => b.amount - a.amount);
    }, [transactions, categories]);

    const getCategoryIcon = (txn) => {
        if (txn.subcategoryId) {
            for (const c of categories) {
                if (c.subcategories && c.subcategories.some(s => s.id === txn.subcategoryId)) {
                    const sub = c.subcategories.find(s => s.id === txn.subcategoryId);
                    return sub?.icon || c.icon || '💸';
                }
            }
        }
        if (txn.categoryId) {
            const c = categories.find(cat => cat.id === txn.categoryId);
            if (c) return c.icon;
        }
        return '💸';
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-950/60 dark:to-amber-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner border border-rose-200/50 dark:border-rose-800/40">
                            <PieChart className="w-6 h-6 pointer-events-none" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{portfolio.name}</h2>
                                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-full">
                                    {transactions.length} khoản chi
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Tổng chi: <span className="font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(totalAmount)}</span>
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
                    {/* 1. Thống kê theo danh mục */}
                    {categoryList.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-rose-500 pointer-events-none" />
                                    Thống kê theo danh mục ({categoryList.length})
                                </h3>
                                <span className="text-xs font-medium text-slate-400">
                                    {totalAmount > 0 ? 'Tỷ trọng %' : ''}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {categoryList.map((cat, index) => {
                                    const percent = totalAmount > 0 ? ((cat.amount / totalAmount) * 100) : 0;
                                    const formattedPercent = percent.toFixed(1);

                                    return (
                                        <div key={index} className="space-y-1.5 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-base select-none">{cat.icon}</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        ({cat.count} giao dịch)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                                        {formatCurrency(cat.amount)}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded min-w-[45px] text-right">
                                                        {formattedPercent}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>

                                            {/* Subcategories list */}
                                            {cat.subItems && cat.subItems.length > 0 && (
                                                <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700 ml-2 mt-2">
                                                    {cat.subItems.map((sub, subIdx) => {
                                                        const subPercent = totalAmount > 0 ? ((sub.amount / totalAmount) * 100).toFixed(1) : 0;
                                                        return (
                                                            <div key={subIdx} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                                                <span className="truncate pr-2">• {sub.name}</span>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                        {formatCurrency(sub.amount)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        ({subPercent}%)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 2. Danh sách các khoản chi gọn gàng */}
                    <div className="space-y-2">
                        <div className="px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Danh sách giao dịch ({transactions.length})
                            </h3>
                        </div>

                        {transactions.length === 0 ? (
                            <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                                    <PieChart className="w-6 h-6 opacity-60" />
                                </div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Không có giao dịch nào trong nhóm này
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                {transactions.map(txn => {
                                    const isIncome = txn.type === 'income';
                                    const formattedDate = txn.date ? new Date(txn.date).toLocaleDateString('vi-VN') : '';
                                    const txnIcon = getCategoryIcon(txn);

                                    return (
                                        <div 
                                            key={txn.id} 
                                            className="p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group" 
                                            onClick={() => onEditTransaction && onEditTransaction(txn)}
                                        >
                                            {/* Category Icon */}
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                                {txnIcon}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                    {txn.description}
                                                </p>
                                                {formattedDate && (
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {formattedDate}{txn.time ? ` • ${txn.time}` : ''}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-sm font-bold flex items-center gap-0.5 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {isIncome ? <ArrowUpRight className="w-3.5 h-3.5 pointer-events-none" /> : <ArrowDownRight className="w-3.5 h-3.5 pointer-events-none" />}
                                                    {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
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

export default PortfolioTransactionsModal;
